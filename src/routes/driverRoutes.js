const express = require('express');
const {
  registerDriver,
  loginDriver
} = require('../controllers/driverController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerDriver);
router.post('/login', loginDriver);

// Protected route (JWT required)
router.get('/profile', protect, (req, res) => {
  res.json({
    message: 'Protected route accessed successfully (driver)',
    driver: req.user
  });
});

module.exports = router;
