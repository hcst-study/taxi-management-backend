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

// Complete a ride (driver only)
exports.completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId).populate('user').populate('driver');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'accepted') return res.status(400).json({ message: 'Ride is not in progress' });

    const user = await User.findById(ride.user._id);
    const driver = await Driver.findById(ride.driver._id);

    // Deduct fare from user
    if (user.wallet < ride.fare) {
      return res.status(400).json({ message: 'User has insufficient balance' });
    }
    user.wallet -= ride.fare;
    await user.save();

    // Add fare to driver
    driver.wallet += ride.fare;
    await driver.save();

    // Update ride status
    ride.status = 'completed';
    await ride.save();

    res.status(200).json({
      message: 'Ride completed successfully',
      ride,
      userWallet: user.wallet,
      driverWallet: driver.wallet
    });
  } catch (error) {
    console.error('Error completing ride:', error);
    res.status(500).json({ error: error.message });
  }
};

// Fetch all rides for current user or driver
exports.getMyRides = async (req, res) => {
  try {
    const user = req.user;

    let rides;
    if (user.role === 'user') {
      rides = await Ride.find({ user: user._id }).populate('driver', 'name phone vehicleType');
    } else if (user.role === 'driver') {
      rides = await Ride.find({ driver: user._id }).populate('user', 'name phone');
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    res.status(200).json({ rides });
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: error.message });
  }
};
