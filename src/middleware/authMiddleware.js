const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header (Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, token missing' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user or driver
    let user = await User.findById(decoded.id).select('-password');
    if (!user) {
      user = await Driver.findById(decoded.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid token: user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// Restrict access to users only
exports.requireUser = (req, res, next) => {
  if (req.user && req.user.role === 'user') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: users only' });
  }
};

// Restrict access to drivers only
exports.requireDriver = (req, res, next) => {
  if (req.user && req.user.role === 'driver') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: drivers only' });
  }
};
