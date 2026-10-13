const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const config = require('../config');

// GET /api/stats/overview (Dashboard summary)
router.get('/overview', authenticate, async (req, res) => {
  try {
    const isEmployee = req.user.role === 'employee';
    const employeeId = req.user.employee_id;

    // Counts by status
    const statusQuery = isEmployee
      ? `SELECT status, COUNT(*) as count FROM leave_requests WHERE employee_id = ? GROUP BY status`
      : `SELECT status, COUNT(*) as count FROM leave_requests GROUP BY status`;
    const statusParams = isEmployee ? [employeeId] : [];
    const statusCounts = await db.query(statusQuery, statusParams);

    const counts = {
      TOTAL: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0
    };

    for (const row of statusCounts) {
      counts[row.status] = Number(row.count);
      counts.TOTAL += Number(row.count);
    }

    // Total employees count
    const empCountRows = await db.query('SELECT COUNT(*) as total FROM employees');
    const totalEmployees = Number(empCountRows[0].total || 0);

    // Leave by type
    const typeQuery = isEmployee
      ? `SELECT lt.type_name, COUNT(lr.leave_id) as count 
         FROM leave_types lt 
         LEFT JOIN leave_requests lr ON lt.leave_type_id = lr.leave_type_id AND lr.employee_id = ?
         GROUP BY lt.type_name`
      : `SELECT lt.type_name, COUNT(lr.leave_id) as count 
         FROM leave_types lt 
         LEFT JOIN leave_requests lr ON lt.leave_type_id = lr.leave_type_id 
         GROUP BY lt.type_name`;
    const typeParams = isEmployee ? [employeeId] : [];
    const byType = await db.query(typeQuery, typeParams);

    // Leave by department (Managers / Admins only)
    let byDept = [];
    if (!isEmployee) {
      byDept = await db.query(`
        SELECT e.department, COUNT(lr.leave_id) as count,
          SUM(CASE WHEN lr.status = 'APPROVED' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN lr.status = 'PENDING' THEN 1 ELSE 0 END) as pending
        FROM employees e
        LEFT JOIN leave_requests lr ON e.employee_id = lr.employee_id
        GROUP BY e.department
      `);
    }

    return res.json({
      success: true,
      stats: {
        counts,
        totalEmployees,
        byType,
        byDepartment: byDept,
        dbInfo: db.getDbInfo()
      }
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch statistics.' });
  }
});

// GET /api/stats/system (DevOps system information)
router.get('/system', async (req, res) => {
  try {
    const memory = process.memoryUsage();
    return res.json({
      success: true,
      system: {
        app_name: 'Employee Leave Management System',
        version: '1.0.0',
        environment: config.NODE_ENV,
        node_version: process.version,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: {
          rss: Math.round(memory.rss / 1024 / 1024),
          heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memory.heapUsed / 1024 / 1024)
        },
        database: db.getDbInfo(),
        devops_pipeline: {
          vcs: 'Git & GitHub',
          ci_cd: 'Jenkins',
          containerization: 'Docker',
          code_quality: 'SonarQube',
          monitoring: 'Prometheus & Grafana',
          healthcheck_url: '/health',
          metrics_url: '/metrics'
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch system info.' });
  }
});

module.exports = router;
