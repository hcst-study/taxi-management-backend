const express = require('express');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateWallet
} = require('../controllers/userController');
const { protect, requireUser } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected user-only routes
router.get('/profile', protect, requireUser, getUserProfile);
router.put('/profile/update', protect, requireUser, updateUserProfile);
router.put('/wallet', protect, requireUser, updateWallet);

module.exports = router;
