const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticate(req, res, next) {
  // Check Authorization header, x-user-id fallback for testing, or query token
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  // Also support demo header 'x-user-id' or 'x-demo-role' for lab convenience
  const demoRole = req.headers['x-demo-role'];
  const demoUserId = req.headers['x-user-id'];

  if (token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
    }
  }

  if (demoUserId) {
    req.user = {
      employee_id: parseInt(demoUserId, 10),
      role: demoRole || 'employee'
    };
    return next();
  }

  return res.status(401).json({ success: false, message: 'Authorization required. Please log in.' });
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
