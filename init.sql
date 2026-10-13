-- Employee Leave Management System
-- MySQL Initial Schema and Seed Data

CREATE DATABASE IF NOT EXISTS leave_management_db;
USE leave_management_db;

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  department VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Types Table
CREATE TABLE IF NOT EXISTS leave_types (
  leave_type_id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(50) UNIQUE NOT NULL,
  available_days INT NOT NULL DEFAULT 12,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
  leave_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days_requested INT NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  manager_remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(leave_type_id) ON DELETE CASCADE
);

-- Seed Data (Passwords bcrypt-hashed with 'admin123', 'manager123', 'password123')
INSERT IGNORE INTO employees (employee_id, name, email, password, department, role) VALUES
(1, 'DevOps Admin', 'admin@company.com', '$2a$10$wT5g80nOq9d9V9R1d2L8v.w6M0F2H3P.4vQ/O5I1E7sK5G6G0M0Fa', 'DevOps & IT', 'admin'),
(2, 'Sarah Connor (HR Manager)', 'manager@company.com', '$2a$10$wT5g80nOq9d9V9R1d2L8v.w6M0F2H3P.4vQ/O5I1E7sK5G6G0M0Fa', 'Human Resources', 'manager'),
(3, 'John Doe', 'john.doe@company.com', '$2a$10$wT5g80nOq9d9V9R1d2L8v.w6M0F2H3P.4vQ/O5I1E7sK5G6G0M0Fa', 'Engineering', 'employee'),
(4, 'Jane Smith', 'jane.smith@company.com', '$2a$10$wT5g80nOq9d9V9R1d2L8v.w6M0F2H3P.4vQ/O5I1E7sK5G6G0M0Fa', 'Marketing', 'employee'),
(5, 'Alex Kumar', 'alex.kumar@company.com', '$2a$10$wT5g80nOq9d9V9R1d2L8v.w6M0F2H3P.4vQ/O5I1E7sK5G6G0M0Fa', 'Product Design', 'employee');

INSERT IGNORE INTO leave_types (leave_type_id, type_name, available_days, description) VALUES
(1, 'Casual Leave', 12, 'General purpose personal time off'),
(2, 'Sick Leave', 10, 'Medical and health related leave'),
(3, 'Earned / Paid Leave', 15, 'Annual accrued vacation leave'),
(4, 'Maternity / Paternity', 90, 'Parental bonding and family leave'),
(5, 'Bereavement Leave', 5, 'Compassionate leave for family loss');

INSERT IGNORE INTO leave_requests (leave_id, employee_id, leave_type_id, from_date, to_date, days_requested, reason, status, manager_remarks) VALUES
(1, 3, 2, '2026-10-15', '2026-10-16', 2, 'Seasonal viral fever doctor recommended rest', 'APPROVED', 'Approved. Get well soon!'),
(2, 4, 1, '2026-10-20', '2026-10-22', 3, 'Attending family wedding anniversary celebration', 'PENDING', NULL),
(3, 5, 3, '2026-11-01', '2026-11-05', 5, 'Planned vacation trip to Himalayas', 'PENDING', NULL),
(4, 3, 1, '2026-09-10', '2026-09-11', 2, 'Personal home relocation work', 'APPROVED', 'Approved by Sarah');
