const bcrypt = require('bcryptjs');

const defaultEmployees = [
  {
    name: 'DevOps Admin',
    email: 'admin@company.com',
    password: 'admin123',
    department: 'DevOps & IT',
    role: 'admin'
  },
  {
    name: 'Sarah Connor (HR Manager)',
    email: 'manager@company.com',
    password: 'manager123',
    department: 'Human Resources',
    role: 'manager'
  },
  {
    name: 'John Doe',
    email: 'john.doe@company.com',
    password: 'password123',
    department: 'Engineering',
    role: 'employee'
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@company.com',
    password: 'password123',
    department: 'Marketing',
    role: 'employee'
  },
  {
    name: 'Alex Kumar',
    email: 'alex.kumar@company.com',
    password: 'password123',
    department: 'Product Design',
    role: 'employee'
  }
];

const defaultLeaveTypes = [
  {
    type_name: 'Casual Leave',
    available_days: 12,
    description: 'General purpose personal time off'
  },
  {
    type_name: 'Sick Leave',
    available_days: 10,
    description: 'Medical and health related leave'
  },
  {
    type_name: 'Earned / Paid Leave',
    available_days: 15,
    description: 'Annual accrued vacation leave'
  },
  {
    type_name: 'Maternity / Paternity',
    available_days: 90,
    description: 'Parental bonding and family leave'
  },
  {
    type_name: 'Bereavement Leave',
    available_days: 5,
    description: 'Compassionate leave for family loss'
  }
];

const defaultLeaveRequests = [
  {
    employee_id: 3, // John Doe
    leave_type_id: 2, // Sick Leave
    from_date: '2026-10-15',
    to_date: '2026-10-16',
    days_requested: 2,
    reason: 'Seasonal viral fever doctor recommended rest',
    status: 'APPROVED',
    manager_remarks: 'Approved. Get well soon!'
  },
  {
    employee_id: 4, // Jane Smith
    leave_type_id: 1, // Casual Leave
    from_date: '2026-10-20',
    to_date: '2026-10-22',
    days_requested: 3,
    reason: 'Attending family wedding anniversary celebration',
    status: 'PENDING',
    manager_remarks: null
  },
  {
    employee_id: 5, // Alex Kumar
    leave_type_id: 3, // Earned Leave
    from_date: '2026-11-01',
    to_date: '2026-11-05',
    days_requested: 5,
    reason: 'Planned vacation trip to Himalayas',
    status: 'PENDING',
    manager_remarks: null
  },
  {
    employee_id: 3, // John Doe
    leave_type_id: 1, // Casual Leave
    from_date: '2026-09-10',
    to_date: '2026-09-11',
    days_requested: 2,
    reason: 'Personal home relocation work',
    status: 'APPROVED',
    manager_remarks: 'Approved by Sarah'
  }
];

async function seedData(db) {
  // Check if employees already exist
  const existingEmployees = await db.query('SELECT COUNT(*) as count FROM employees');
  const count = existingEmployees[0].count || existingEmployees[0]['COUNT(*)'] || 0;

  if (count > 0) {
    return; // Already seeded
  }

  console.log('🌱 Seeding initial database records...');

  // Seed Employees
  for (const emp of defaultEmployees) {
    const hashedPassword = bcrypt.hashSync(emp.password, 10);
    await db.execute(
      'INSERT INTO employees (name, email, password, department, role) VALUES (?, ?, ?, ?, ?)',
      [emp.name, emp.email, hashedPassword, emp.department, emp.role]
    );
  }

  // Seed Leave Types
  for (const lt of defaultLeaveTypes) {
    await db.execute(
      'INSERT INTO leave_types (type_name, available_days, description) VALUES (?, ?, ?)',
      [lt.type_name, lt.available_days, lt.description]
    );
  }

  // Seed Sample Leave Requests
  for (const lr of defaultLeaveRequests) {
    await db.execute(
      `INSERT INTO leave_requests 
        (employee_id, leave_type_id, from_date, to_date, days_requested, reason, status, manager_remarks) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [lr.employee_id, lr.leave_type_id, lr.from_date, lr.to_date, lr.days_requested, lr.reason, lr.status, lr.manager_remarks]
    );
  }

  console.log('✅ Database seeded successfully with demo users, leave types, and sample requests.');
}

module.exports = {
  defaultEmployees,
  defaultLeaveTypes,
  seedData
};
