const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver');

// 🟢 User requests a ride
exports.requestRide = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, fare } = req.body;
    const user = req.user;

    // Check wallet balance
    if (user.wallet < fare) {
      return res.status(400).json({ message: 'Insufficient wallet balance' });
    }

    // Deduct fare immediately (hold the fare)
    user.wallet -= fare;
    await user.save();

    // Create ride
    const ride = await Ride.create({
      user: user._id,
      pickupLocation,
      dropoffLocation,
      fare,
      status: 'requested',
    });

    res.status(201).json({
      message: 'Ride requested successfully (fare deducted)',
      ride,
      userWallet: user.wallet,
    });
  } catch (error) {
    console.error('Error requesting ride:', error);
    res.status(500).json({ error: error.message });
  }
};

// 🟡 Driver views all available ride requests
exports.getAvailableRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'requested' }).populate('user', 'name phone');
    res.status(200).json({ rides });
  } catch (error) {
    console.error('Error fetching available rides:', error);
    res.status(500).json({ error: error.message });
  }
};

// 🟠 Driver accepts a ride
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

// 🟡 Start a ride (driver begins trip)
exports.startRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const driver = req.user;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'accepted') {
      return res.status(400).json({ message: 'Ride is not ready to start' });
    }

    // Only assigned driver can start this ride
    if (ride.driver.toString() !== driver._id.toString()) {
      return res.status(403).json({ message: 'Access denied: not your ride' });
    }

    ride.status = 'on-trip';
    ride.startTime = new Date();
    await ride.save();

    res.status(200).json({
      message: 'Ride started successfully',
      ride,
    });
  } catch (error) {
    console.error('Error starting ride:', error);
    res.status(500).json({ error: error.message });
  }
};


// 🟣 Complete a ride (driver only)
exports.completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId).populate('user').populate('driver');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'on-trip') {
      return res.status(400).json({ message: 'Ride is not in progress' });
    }

    const driver = await Driver.findById(ride.driver._id);

    // Add fare to driver's wallet
    driver.wallet += ride.fare;
    await driver.save();

    // Update ride status and end time
    ride.status = 'completed';
    ride.endTime = new Date();
    await ride.save();

    res.status(200).json({
      message: 'Ride completed successfully',
      ride,
      driverWallet: driver.wallet,
    });
  } catch (error) {
    console.error('Error completing ride:', error);
    res.status(500).json({ error: error.message });
  }
};

// 🚫 Cancel a ride (user or driver)
exports.cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const user = req.user;

    const ride = await Ride.findById(rideId).populate('user').populate('driver');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    if (ride.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed ride' });
    }
    if (ride.status === 'cancelled') {
      return res.status(400).json({ message: 'Ride already cancelled' });
    }

    let refundAmount = 0;
    let message = '';
    let isUser = user.role === 'user';
    let isDriver = user.role === 'driver';

    // 🧠 Determine refund/penalty rules
    if (isUser) {
      if (ride.status === 'requested') {
        refundAmount = ride.fare; // full refund
        message = 'Ride cancelled before acceptance — full refund';
      } else if (ride.status === 'accepted') {
        refundAmount = ride.fare * 0.8; // 80% refund
        message = 'Ride cancelled after acceptance — 80% refund applied';
      } else if (ride.status === 'on-trip') {
        refundAmount = 0; // no refund
        message = 'Ride already in progress — no refund';
      } else {
        message = 'Invalid ride status';
      }

      // refund user
      if (refundAmount > 0) {
        const userData = await User.findById(ride.user._id);
        userData.wallet += refundAmount;
        await userData.save();
      }

      ride.status = 'cancelled';
      await ride.save();
    }

    else if (isDriver) {
      if (ride.status === 'accepted') {
        refundAmount = ride.fare; // full refund to user
        message = 'Driver cancelled before trip start — user fully refunded';
      } else if (ride.status === 'on-trip') {
        refundAmount = ride.fare; // full refund
        message = 'Driver cancelled mid-trip — full refund to user, driver flagged';
      } else {
        message = 'Invalid driver cancellation timing';
      }

      // refund user
      const userData = await User.findById(ride.user._id);
      if (userData) {
        userData.wallet += refundAmount;
        await userData.save();
      }

      ride.status = 'cancelled';
      await ride.save();
    }

    else {
      return res.status(403).json({ message: 'Access denied: unauthorized role' });
    }

    res.status(200).json({
      message,
      refunded: refundAmount,
      newStatus: ride.status,
    });
  } catch (error) {
    console.error('Error cancelling ride:', error);
    res.status(500).json({ error: error.message });
  }
};

// 🧾 Fetch all rides for current user or driver
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
