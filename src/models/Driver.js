const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
    },
    vehicleType: {
      type: String,
      enum: ['car', 'bike', 'auto'],
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    role: {
      type: String,
      enum: ['driver'],
      default: 'driver',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);
