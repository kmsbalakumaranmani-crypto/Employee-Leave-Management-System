const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  leaveRequestsCreated,
  leaveRequestsApproved,
  leaveRequestsRejected
} = require('../middleware/metrics');

// Helper to calculate days between two dates inclusive
function calculateDays(fromDate, toDate) {
  const d1 = new Date(fromDate);
  const d2 = new Date(toDate);
  const diffTime = d2.getTime() - d1.getTime();
  if (diffTime < 0) return 0;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// GET /api/leaves (List leave requests)
router.get('/', authenticate, async (req, res) => {
  try {
    let sql = `
      SELECT 
        lr.leave_id,
        lr.employee_id,
        e.name AS employee_name,
        e.email AS employee_email,
        e.department,
        lr.leave_type_id,
        lt.type_name AS leave_type,
        lr.from_date,
        lr.to_date,
        lr.days_requested,
        lr.reason,
        lr.status,
        lr.manager_remarks,
        lr.created_at,
        lr.updated_at
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.employee_id
      JOIN leave_types lt ON lr.leave_type_id = lt.leave_type_id
    `;

    const params = [];
    const conditions = [];

    // If employee role, filter by own ID
    if (req.user.role === 'employee') {
      conditions.push('lr.employee_id = ?');
      params.push(req.user.employee_id);
    } else {
      // Manager/Admin can filter by query params
      if (req.query.employee_id) {
        conditions.push('lr.employee_id = ?');
        params.push(parseInt(req.query.employee_id, 10));
      }
      if (req.query.department) {
        conditions.push('e.department = ?');
        params.push(req.query.department);
      }
    }

    if (req.query.status) {
      conditions.push('lr.status = ?');
      params.push(req.query.status.toUpperCase());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY lr.created_at DESC';

    const leaves = await db.query(sql, params);
    return res.json({ success: true, count: leaves.length, leaves });
  } catch (err) {
    console.error('Error fetching leave requests:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch leave requests.' });
  }
});

// GET /api/leaves/balance (Leave balance for employee)
router.get('/balance', authenticate, async (req, res) => {
  try {
    const employeeId = req.query.employee_id && (req.user.role === 'admin' || req.user.role === 'manager')
      ? parseInt(req.query.employee_id, 10)
      : req.user.employee_id;

    // Get all leave types
    const leaveTypes = await db.query('SELECT * FROM leave_types ORDER BY leave_type_id ASC');

    // Get approved leave days taken by employee grouped by leave_type_id
    const takenLeaves = await db.query(
      `SELECT leave_type_id, SUM(days_requested) AS days_used 
       FROM leave_requests 
       WHERE employee_id = ? AND status = 'APPROVED' 
       GROUP BY leave_type_id`,
      [employeeId]
    );

    const usedMap = {};
    for (const row of takenLeaves) {
      usedMap[row.leave_type_id] = Number(row.days_used || 0);
    }

    const balanceSummary = leaveTypes.map(lt => {
      const used = usedMap[lt.leave_type_id] || 0;
      const remaining = Math.max(0, lt.available_days - used);
      return {
        leave_type_id: lt.leave_type_id,
        type_name: lt.type_name,
        total_days: lt.available_days,
        used_days: used,
        remaining_days: remaining
      };
    });

    return res.json({ success: true, balances: balanceSummary });
  } catch (err) {
    console.error('Error calculating leave balance:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate leave balance.' });
  }
});

// POST /api/leaves (Submit a new leave request)
router.post('/', authenticate, async (req, res) => {
  try {
    const { leave_type_id, from_date, to_date, reason } = req.body;
    const employeeId = req.user.employee_id;

    if (!leave_type_id || !from_date || !to_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.'
      });
    }

    const days = calculateDays(from_date, to_date);
    if (days <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range: End date must be on or after start date.'
      });
    }

    // Verify leave type exists
    const ltRows = await db.query('SELECT * FROM leave_types WHERE leave_type_id = ?', [leave_type_id]);
    if (ltRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid leave type selected.' });
    }
    const leaveType = ltRows[0];

    const result = await db.execute(
      `INSERT INTO leave_requests 
        (employee_id, leave_type_id, from_date, to_date, days_requested, reason, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [employeeId, leave_type_id, from_date, to_date, days, reason.trim()]
    );

    // Track Prometheus metric
    try {
      leaveRequestsCreated.inc({ leave_type: leaveType.type_name });
    } catch (e) {
      // Prometheus metric error shouldn't fail request
    }

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully with status PENDING',
      leave_id: result.insertId,
      days_requested: days
    });
  } catch (err) {
    console.error('Error submitting leave request:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit leave request.' });
  }
});

// PUT /api/leaves/:id/status (Approve or Reject leave request - Manager / Admin)
router.put('/:id/status', authenticate, requireRole(['manager', 'admin']), async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id, 10);
    const { status, manager_remarks } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Valid status must be either APPROVED or REJECTED.'
      });
    }

    const normStatus = status.toUpperCase();

    const existing = await db.query('SELECT * FROM leave_requests WHERE leave_id = ?', [leaveId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    await db.execute(
      `UPDATE leave_requests 
       SET status = ?, manager_remarks = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE leave_id = ?`,
      [normStatus, manager_remarks || `Status updated to ${normStatus} by ${req.user.name || 'Manager'}`, leaveId]
    );

    // Track Prometheus metric
    try {
      if (normStatus === 'APPROVED') {
        leaveRequestsApproved.inc();
      } else {
        leaveRequestsRejected.inc();
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: `Leave request has been ${normStatus}.`,
      status: normStatus
    });
  } catch (err) {
    console.error('Error updating leave status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update leave status.' });
  }
});

// DELETE /api/leaves/:id (Cancel leave request)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id, 10);
    const existing = await db.query('SELECT * FROM leave_requests WHERE leave_id = ?', [leaveId]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    const leave = existing[0];

    // Employees can only cancel their own PENDING requests
    if (req.user.role === 'employee') {
      if (leave.employee_id !== req.user.employee_id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      if (leave.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Only PENDING leave requests can be cancelled.'
        });
      }
    }

    await db.execute('DELETE FROM leave_requests WHERE leave_id = ?', [leaveId]);

    return res.json({ success: true, message: 'Leave request deleted/cancelled successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete leave request.' });
  }
});

module.exports = router;
