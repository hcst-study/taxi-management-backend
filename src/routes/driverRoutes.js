const express = require('express');
const {
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverProfile
} = require('../controllers/driverController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerDriver);
router.post('/login', loginDriver);

// Protected routes
router.get('/profile', protect, getDriverProfile);
router.put('/profile/update', protect, updateDriverProfile);

module.exports = router;
