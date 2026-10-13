const client = require('prom-client');

// Initialize Prometheus registry
const register = new client.Registry();

// Add default system metrics (CPU, Memory, Event Loop, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'leave_app_'
});

// Custom HTTP Metrics
const httpRequestCounter = new client.Counter({
  name: 'leave_app_http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'leave_app_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [register]
});

// Business Metrics for DevOps Monitoring
const leaveRequestsCreated = new client.Counter({
  name: 'leave_app_leaves_created_total',
  help: 'Total number of leave requests submitted',
  labelNames: ['leave_type'],
  registers: [register]
});

const leaveRequestsApproved = new client.Counter({
  name: 'leave_app_leaves_approved_total',
  help: 'Total number of leave requests approved',
  registers: [register]
});

const leaveRequestsRejected = new client.Counter({
  name: 'leave_app_leaves_rejected_total',
  help: 'Total number of leave requests rejected',
  registers: [register]
});

// Middleware to track HTTP metrics
function metricsMiddleware(req, res, next) {
  const start = process.hrtime();

  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const durationInSeconds = elapsed[0] + elapsed[1] / 1e9;

    // Normalize path (e.g. replace IDs with :id)
    const route = req.route ? req.baseUrl + req.route.path : req.baseUrl || req.path;

    if (route !== '/metrics') {
      httpRequestCounter.inc({
        method: req.method,
        route: route || req.path,
        status_code: res.statusCode
      });

      httpRequestDuration.observe(
        {
          method: req.method,
          route: route || req.path,
          status_code: res.statusCode
        },
        durationInSeconds
      );
    }
  });

  next();
}

module.exports = {
  register,
  metricsMiddleware,
  leaveRequestsCreated,
  leaveRequestsApproved,
  leaveRequestsRejected
};
