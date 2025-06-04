const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Get JWT secret from config
const JWT_SECRET = config.JWT_SECRET;

// Middleware to verify token
const authMiddleware = (req, res, next) => {
  // Debug: Log all headers
  console.log('AUTH MIDDLEWARE: Headers received:', JSON.stringify(req.headers, null, 2));
  
  // Try to get token from different possible headers
  let token = req.header('x-auth-token') || 
              req.header('authorization') || 
              req.header('token');
  
  // Handle Bearer token format
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }
  
  console.log('AUTH MIDDLEWARE: Token extracted:', token ? 'Token found' : 'No token');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('AUTH MIDDLEWARE: Token verified successfully for user:', decoded.id);

    // Add user from payload
    req.user = decoded;
    next();
  } catch (err) {
    console.error('AUTH MIDDLEWARE: Token verification failed:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check admin role
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required' });
  }
};

module.exports = { authMiddleware, adminOnly }; 