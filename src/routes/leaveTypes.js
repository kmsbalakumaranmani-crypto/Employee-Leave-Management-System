const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/leave-types (Public or Authenticated)
router.get('/', async (req, res) => {
  try {
    const leaveTypes = await db.query('SELECT * FROM leave_types ORDER BY leave_type_id ASC');
    return res.json({ success: true, leaveTypes });
  } catch (err) {
    console.error('Error fetching leave types:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch leave types.' });
  }
});

// POST /api/leave-types (Admin only)
router.post('/', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { type_name, available_days, description } = req.body;

    if (!type_name || available_days === undefined) {
      return res.status(400).json({ success: false, message: 'Type name and available days are required.' });
    }

    const result = await db.execute(
      'INSERT INTO leave_types (type_name, available_days, description) VALUES (?, ?, ?)',
      [type_name.trim(), parseInt(available_days, 10), description || '']
    );

    return res.status(201).json({
      success: true,
      message: 'Leave type created successfully',
      leave_type_id: result.insertId
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'Leave type with this name already exists.' });
    }
    console.error('Error creating leave type:', err);
    return res.status(500).json({ success: false, message: 'Failed to create leave type.' });
  }
});

// PUT /api/leave-types/:id (Admin only)
router.put('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const leaveTypeId = parseInt(req.params.id, 10);
    const { type_name, available_days, description } = req.body;

    const existing = await db.query('SELECT * FROM leave_types WHERE leave_type_id = ?', [leaveTypeId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Leave type not found.' });
    }

    await db.execute(
      'UPDATE leave_types SET type_name = ?, available_days = ?, description = ? WHERE leave_type_id = ?',
      [
        type_name || existing[0].type_name,
        available_days !== undefined ? parseInt(available_days, 10) : existing[0].available_days,
        description !== undefined ? description : existing[0].description,
        leaveTypeId
      ]
    );

    return res.json({ success: true, message: 'Leave type updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update leave type.' });
  }
});

// DELETE /api/leave-types/:id (Admin only)
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const leaveTypeId = parseInt(req.params.id, 10);
    const result = await db.execute('DELETE FROM leave_types WHERE leave_type_id = ?', [leaveTypeId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Leave type not found.' });
    }

    return res.json({ success: true, message: 'Leave type deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete leave type.' });
  }
});

module.exports = router;
