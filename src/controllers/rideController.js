const axios = require('axios');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Driver = require('../models/Driver');

// 🚗 User requests a ride — distance + fare using OpenRouteService
exports.requestRide = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, vehicleType } = req.body;
    const user = req.user;

    // 1️⃣ Convert addresses to coordinates (geocoding)
    const geoURL = `https://api.openrouteservice.org/geocode/search?api_key=${process.env.ORS_API_KEY}&text=`;
    const [pickupRes, dropRes] = await Promise.all([
      axios.get(`${geoURL}${encodeURIComponent(pickupLocation)}`),
      axios.get(`${geoURL}${encodeURIComponent(dropoffLocation)}`),
    ]);

    if (!pickupRes.data.features.length || !dropRes.data.features.length) {
      return res.status(400).json({ message: 'Invalid pickup or dropoff location' });
    }

    const [pickupLon, pickupLat] = pickupRes.data.features[0].geometry.coordinates;
    const [dropLon, dropLat] = dropRes.data.features[0].geometry.coordinates;

    // 2️⃣ Get distance via Directions API
    const routeURL = `https://api.openrouteservice.org/v2/directions/driving-car`;
    const routeRes = await axios.post(
      routeURL,
      { coordinates: [[pickupLon, pickupLat], [dropLon, dropLat]] },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const distanceMeters = routeRes.data.routes[0].summary.distance;
    const durationSeconds = routeRes.data.routes[0].summary.duration;
    const distanceKm = distanceMeters / 1000;

    // 3️⃣ Fare calculation
    const baseFare = 50;
    let ratePerKm = 15;

    if (vehicleType === 'Sedan') ratePerKm = 18;
    if (vehicleType === 'SUV') ratePerKm = 22;

    const fare = Math.round(baseFare + distanceKm * ratePerKm);

    // 4️⃣ Check wallet balance and deduct
    const userData = await User.findById(user._id);
    if (userData.wallet < fare) {
      return res.status(400).json({ message: 'Insufficient balance in wallet' });
    }

    userData.wallet -= fare;
    await userData.save();

    // 5️⃣ Save ride
    const newRide = await Ride.create({
      user: user._id,
      pickupLocation,
      dropoffLocation,
      fare,
      status: 'requested',
    });

    res.status(201).json({
      message: 'Ride requested successfully (ORS)',
      distanceKm: distanceKm.toFixed(2),
      durationMinutes: (durationSeconds / 60).toFixed(1),
      calculatedFare: fare,
      ride: newRide,
    });
  } catch (error) {
    console.error('Error calculating fare with ORS:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to calculate fare. Check locations or API key.' });
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
    if (ride.status !== 'requested')
      return res.status(400).json({ message: 'Ride already accepted or closed' });

    ride.driver = driver._id;
    ride.status = 'accepted';
    await ride.save();

    res.status(200).json({ message: 'Ride accepted successfully', ride });
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
    if (ride.status !== 'accepted')
      return res.status(400).json({ message: 'Ride is not ready to start' });

    if (ride.driver.toString() !== driver._id.toString()) {
      return res.status(403).json({ message: 'Access denied: not your ride' });
    }

    ride.status = 'on-trip';
    ride.startTime = new Date();
    await ride.save();

    res.status(200).json({ message: 'Ride started successfully', ride });
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
    if (ride.status !== 'on-trip')
      return res.status(400).json({ message: 'Ride is not in progress' });

    const driver = await Driver.findById(ride.driver._id);
    driver.wallet += ride.fare;
    await driver.save();

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

    if (ride.status === 'completed')
      return res.status(400).json({ message: 'Cannot cancel a completed ride' });
    if (ride.status === 'cancelled')
      return res.status(400).json({ message: 'Ride already cancelled' });

    let refundAmount = 0;
    let message = '';
    const isUser = user.role === 'user';
    const isDriver = user.role === 'driver';

    if (isUser) {
      if (ride.status === 'requested') {
        refundAmount = ride.fare;
        message = 'Ride cancelled before acceptance — full refund';
      } else if (ride.status === 'accepted') {
        refundAmount = ride.fare * 0.8;
        message = 'Ride cancelled after acceptance — 80% refund applied';
      } else if (ride.status === 'on-trip') {
        refundAmount = 0;
        message = 'Ride already in progress — no refund';
      }

      if (refundAmount > 0) {
        const userData = await User.findById(ride.user._id);
        userData.wallet += refundAmount;
        await userData.save();
      }

      ride.status = 'cancelled';
      await ride.save();
    } else if (isDriver) {
      if (ride.status === 'accepted') {
        refundAmount = ride.fare;
        message = 'Driver cancelled before trip start — user fully refunded';
      } else if (ride.status === 'on-trip') {
        refundAmount = ride.fare;
        message = 'Driver cancelled mid-trip — full refund to user, driver flagged';
      }

      const userData = await User.findById(ride.user._id);
      if (userData) {
        userData.wallet += refundAmount;
        await userData.save();
      }

      ride.status = 'cancelled';
      await ride.save();
    } else {
      return res.status(403).json({ message: 'Access denied: unauthorized role' });
    }

    res.status(200).json({ message, refunded: refundAmount, newStatus: ride.status });
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
