const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    pickupLocation: {
      type: String,
      required: true,
    },
    dropoffLocation: {
      type: String,
      required: true,
    },
    fare: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'on-trip', 'completed', 'cancelled'], // ✅ added 'on-trip'
      default: 'requested',
    },
    startTime: {
      type: Date, // ✅ new field — when driver starts the ride
      default: null,
    },
    endTime: {
      type: Date, // ✅ new field — when ride is completed
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ride', rideSchema);
