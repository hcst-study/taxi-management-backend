const Driver = require('../models/Driver');
const bcrypt = require('bcryptjs');

// Register a new driver
exports.registerDriver = async (req, res) => {
  try {
    const { name, email, password, phone, licenseNumber, vehicleType, vehicleNumber } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ email });
    if (existingDriver) {
      return res.status(400).json({ message: 'Driver already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create driver
    const newDriver = new Driver({
      name,
      email,
      password: hashedPassword,
      phone,
      licenseNumber,
      vehicleType,
      vehicleNumber,
      role: 'driver'
    });

    // Save to DB
    const savedDriver = await newDriver.save();

    // Respond with driver data (omit password)
    res.status(201).json({
      message: 'Driver registered successfully',
      driver: {
        _id: savedDriver._id,
        name: savedDriver.name,
        email: savedDriver.email,
        phone: savedDriver.phone,
        licenseNumber: savedDriver.licenseNumber,
        vehicleType: savedDriver.vehicleType,
        vehicleNumber: savedDriver.vehicleNumber,
        role: savedDriver.role,
        createdAt: savedDriver.createdAt,
        updatedAt: savedDriver.updatedAt
      }
    });
  } catch (error) {
    console.error('Error registering driver:', error);
    res.status(500).json({ error: error.message });
  }
};

// Login driver with JWT
exports.loginDriver = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find driver
    const driver = await Driver.findOne({ email });
    if (!driver) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: driver._id, role: driver.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      driver: {
        _id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        role: driver.role,
      },
    });
  } catch (error) {
    console.error('Error logging in driver:', error);
    res.status(500).json({ error: error.message });
  }
};
