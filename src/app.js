const express = require('express');
const cors = require('cors');
const path = require('path');
const { register, metricsMiddleware } = require('./middleware/metrics');
const db = require('./db');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const leaveRoutes = require('./routes/leaves');
const leaveTypeRoutes = require('./routes/leaveTypes');
const statsRoutes = require('./routes/stats');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Track HTTP metrics for Prometheus
app.use(metricsMiddleware);

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// DevOps Health Check endpoint (for Docker / Kubernetes probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: db.getDbInfo(),
    service: 'employee-leave-management'
  });
});

// DevOps Prometheus Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/stats', statsRoutes);

// SPA fallback for HTML frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health' || req.path === '/metrics') {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.'
  });
});

module.exports = app;
