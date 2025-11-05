const express = require('express');
const {
  requestRide,
  getAvailableRides,
  acceptRide,
  completeRide,
  getMyRides
} = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// User requests a ride
router.post('/request', protect, requestRide);

// Driver views all available rides
router.get('/available', protect, getAvailableRides);

// Driver accepts a ride
router.put('/accept/:rideId', protect, acceptRide);

// Driver completes a ride
router.put('/complete/:rideId', protect, completeRide);

// Get all rides for current user/driver
router.get('/my-rides', protect, getMyRides);

module.exports = router;
