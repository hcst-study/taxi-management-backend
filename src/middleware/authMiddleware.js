const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Driver = require('../models/Driver');

// Middleware to protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Get token from Authorization header (Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 2️⃣ If no token, block access
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, token missing' });
    }

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Attach user or driver to request
    let user = await User.findById(decoded.id).select('-password');
    if (!user) {
      user = await Driver.findById(decoded.id).select('-password');
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid token: user not found' });
    }

    req.user = user; // attach to request object
    next(); // continue to next middleware/controller
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};
