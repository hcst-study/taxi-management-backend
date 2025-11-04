const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role: 'user', // default role
    });

    // Save user to database
    const savedUser = await newUser.save();

    // Respond with saved user (omit password)
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        _id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
        wallet: savedUser.wallet,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message });
  }
};

// Login user with JWT
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Successful login
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        wallet: user.wallet,
      },
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: error.message });
  }
};
