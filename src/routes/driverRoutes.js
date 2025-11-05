const express = require('express');
const {
  registerDriver,
  loginDriver,
  getDriverProfile,
  updateDriverProfile,
  updateDriverWallet
} = require('../controllers/driverController');
const { protect, requireDriver } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerDriver);
router.post('/login', loginDriver);

// Protected driver-only routes
router.get('/profile', protect, requireDriver, getDriverProfile);
router.put('/profile/update', protect, requireDriver, updateDriverProfile);
router.put('/wallet', protect, requireDriver, updateDriverWallet);

module.exports = router;
