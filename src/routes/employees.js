const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/employees (Admin & Manager)
router.get('/', authenticate, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const employees = await db.query(
      `SELECT employee_id, name, email, department, role, created_at 
       FROM employees 
       ORDER BY employee_id ASC`
    );
    return res.json({ success: true, employees });
  } catch (err) {
    console.error('Error fetching employees:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch employees.' });
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);

    // Employees can only view their own profile, unless they are admin/manager
    if (req.user.role === 'employee' && req.user.employee_id !== empId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const rows = await db.query(
      `SELECT employee_id, name, email, department, role, created_at 
       FROM employees 
       WHERE employee_id = ?`,
      [empId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    return res.json({ success: true, employee: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employee details.' });
  }
});

// POST /api/employees (Admin only)
router.post('/', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, department, role } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and department are required.'
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const assignedRole = ['admin', 'manager', 'employee'].includes(role) ? role : 'employee';

    const result = await db.execute(
      `INSERT INTO employees (name, email, password, department, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword, department.trim(), assignedRole]
    );

    return res.status(201).json({
      success: true,
      message: 'Employee added successfully',
      employee_id: result.insertId
    });
  } catch (err) {
    if (err.message && (err.message.includes('UNIQUE') || err.message.includes('Duplicate'))) {
      return res.status(409).json({ success: false, message: 'An employee with this email already exists.' });
    }
    console.error('Error adding employee:', err);
    return res.status(500).json({ success: false, message: 'Failed to add employee.' });
  }
});

// PUT /api/employees/:id (Admin only)
router.put('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);
    const { name, email, department, role, password } = req.body;

    const existing = await db.query('SELECT * FROM employees WHERE employee_id = ?', [empId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    let queryStr = 'UPDATE employees SET name = ?, email = ?, department = ?, role = ?';
    let params = [
      name || existing[0].name,
      email ? email.toLowerCase() : existing[0].email,
      department || existing[0].department,
      role || existing[0].role
    ];

    if (password && password.trim().length > 0) {
      queryStr += ', password = ?';
      params.push(bcrypt.hashSync(password, 10));
    }

    queryStr += ' WHERE employee_id = ?';
    params.push(empId);

    await db.execute(queryStr, params);

    return res.json({ success: true, message: 'Employee updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update employee.' });
  }
});

// DELETE /api/employees/:id (Admin only)
router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const empId = parseInt(req.params.id, 10);

    // Prevent deleting self
    if (req.user.employee_id === empId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    const result = await db.execute('DELETE FROM employees WHERE employee_id = ?', [empId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    return res.json({ success: true, message: 'Employee removed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to remove employee.' });
  }
});

module.exports = router;
