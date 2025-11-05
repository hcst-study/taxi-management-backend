const express = require('express');
const { requestRide, getAvailableRides, acceptRide } = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// User requests a ride
router.post('/request', protect, requestRide);

// Driver views all available rides
router.get('/available', protect, getAvailableRides);

// Driver accepts a ride
router.put('/accept/:rideId', protect, acceptRide);

module.exports = router;
