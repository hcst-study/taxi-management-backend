const express = require('express');
const {
  requestRide,
  getAvailableRides,
  acceptRide,
  startRide,
  completeRide,
  cancelRide,
  getMyRides
} = require('../controllers/rideController');
const { protect, requireUser, requireDriver } = require('../middleware/authMiddleware');

const router = express.Router();

// User requests a ride
router.post('/request', protect, requireUser, requestRide);

// Driver views available rides
router.get('/available', protect, requireDriver, getAvailableRides);

// Driver accepts a ride
router.put('/accept/:rideId', protect, requireDriver, acceptRide);

// 🟡 Driver starts a ride (new)
router.put('/start/:rideId', protect, requireDriver, startRide);

// Driver completes a ride
router.put('/complete/:rideId', protect, requireDriver, completeRide);

// Cancel ride (user or driver)
router.put('/cancel/:rideId', protect, cancelRide);

// Get all rides for current user/driver
router.get('/my-rides', protect, getMyRides);

module.exports = router;
