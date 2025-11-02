require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('./User');
const Driver = require('./Driver');

const runTest = async () => {
  await connectDB();

  // Create sample user
  const user = new User({
    name: 'Alice Doe',
    email: 'alice@example.com',
    password: 'password123',
    phone: '9876543210',
  });

  // Create sample driver
  const driver = new Driver({
    name: 'Bob Driver',
    email: 'bobdriver@example.com',
    password: 'password123',
    phone: '9123456789',
    licenseNumber: 'DL-01-2025-001',
    vehicleType: 'car',
    vehicleNumber: 'KA01AB1234',
  });

  await user.save();
  await driver.save();

  console.log('✅ Test data saved successfully!');
  mongoose.connection.close();
};

runTest();
