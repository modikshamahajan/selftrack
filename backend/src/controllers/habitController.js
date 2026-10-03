const asyncHandler = require('express-async-handler');
const Habit = require('../models/Habit');

// @desc    Get user habits
// @route   GET /api/habits
// @access  Private
const getHabits = asyncHandler(async (req, res) => {
  const habits = await Habit.find({ user: req.user.id });
  res.json(habits);
});

// @desc    Create habit
// @route   POST /api/habits
// @access  Private
const createHabit = asyncHandler(async (req, res) => {
  const { name, icon, color, category, streakTarget } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Please add a habit name');
  }

  const habit = await Habit.create({
    user: req.user.id,
    name,
    icon,
    color,
    category,
    streakTarget,
  });

  res.status(201).json(habit);
});

// @desc    Update habit
// @route   PUT /api/habits/:id
// @access  Private
const updateHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findById(req.params.id);

  if (!habit) {
    res.status(404);
    throw new Error('Habit not found');
  }

  // Make sure the logged in user matches the habit user
  if (habit.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const updatedHabit = await Habit.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json(updatedHabit);
});

// @desc    Toggle habit completion for a specific date
// @route   POST /api/habits/:id/toggle
// @access  Private
const toggleHabit = asyncHandler(async (req, res) => {
  const { date } = req.body; // Expecting date string "YYYY-MM-DD"
  
  if (!date) {
    res.status(400);
    throw new Error('Please provide a date');
  }

  const habit = await Habit.findById(req.params.id);

  if (!habit) {
    res.status(404);
    throw new Error('Habit not found');
  }

  // Make sure the logged in user matches the habit user
  if (habit.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  const dateIndex = habit.completedDates.indexOf(date);

  if (dateIndex !== -1) {
    // Date exists, so un-complete it (remove from array)
    habit.completedDates.splice(dateIndex, 1);
  } else {
    // Date doesn't exist, so complete it (add to array)
    habit.completedDates.push(date);
  }

  // Simple streak logic: update currentStreak based on total completed days for now
  // In production, you would calculate consecutive days from the date array
  habit.currentStreak = habit.completedDates.length;

  await habit.save();

  res.json(habit);
});

// @desc    Delete habit
// @route   DELETE /api/habits/:id
// @access  Private
const deleteHabit = asyncHandler(async (req, res) => {
  const habit = await Habit.findById(req.params.id);

  if (!habit) {
    res.status(404);
    throw new Error('Habit not found');
  }

  if (habit.user.toString() !== req.user.id) {
    res.status(401);
    throw new Error('User not authorized');
  }

  await habit.deleteOne();

  res.json({ id: req.params.id });
});

module.exports = {
  getHabits,
  createHabit,
  updateHabit,
  toggleHabit,
  deleteHabit,
};
