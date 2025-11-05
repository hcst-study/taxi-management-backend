const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver');

// User requests a ride
exports.requestRide = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, fare } = req.body;
    const user = req.user;

    if (user.wallet < fare) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    const ride = await Ride.create({
      user: user._id,
      pickupLocation,
      dropoffLocation,
      fare,
      status: 'requested',
    });

    res.status(201).json({
      message: 'Ride requested successfully',
      ride,
    });
  } catch (error) {
    console.error('Error requesting ride:', error);
    res.status(500).json({ error: error.message });
  }
};

// Driver views all available ride requests
exports.getAvailableRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'requested' }).populate('user', 'name phone');
    res.status(200).json({ rides });
  } catch (error) {
    console.error('Error fetching available rides:', error);
    res.status(500).json({ error: error.message });
  }
};

// Driver accepts a ride
exports.acceptRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driver = req.user;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'requested') return res.status(400).json({ message: 'Ride already accepted or closed' });

    ride.driver = driver._id;
    ride.status = 'accepted';
    await ride.save();

    res.status(200).json({
      message: 'Ride accepted successfully',
      ride,
    });
  } catch (error) {
    console.error('Error accepting ride:', error);
    res.status(500).json({ error: error.message });
  }
};
