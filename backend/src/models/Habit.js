const mongoose = require('mongoose');

const habitSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Please add a habit name'],
    },
    icon: {
      type: String,
      required: true,
      default: 'droplet',
    },
    color: {
      type: String,
      required: true,
      default: '#31C764',
    },
    category: {
      type: String,
      required: true,
      default: 'Health',
    },
    streakTarget: {
      type: Number,
      required: true,
      default: 7,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    completedDates: [
      {
        type: String, // format: "YYYY-MM-DD"
      }
    ],
  },
  {
    timestamps: true,
  }
);

const Habit = mongoose.model('Habit', habitSchema);

module.exports = Habit;
