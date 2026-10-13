const path = require('path');
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'devops-leave-management-super-secret-key-2026',
  DB_TYPE: process.env.DB_TYPE || (process.env.MYSQL_HOST ? 'mysql' : 'sqlite'),
  MYSQL: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'leave_user',
    password: process.env.MYSQL_PASSWORD || 'leave_pass123',
    database: process.env.MYSQL_DATABASE || 'leave_management_db'
  },
  SQLITE_PATH: process.env.SQLITE_PATH || path.join(__dirname, '../../data/leave_management.db')
};
