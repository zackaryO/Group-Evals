const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');

// Route to get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Route to get only student users
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Route to add a new user
router.post('/add', async (req, res) => {
  const { username, password, role, teamName, firstName, lastName, subject } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role, teamName, firstName, lastName, subject });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Route to remove a user
router.delete('/:userId', async (req, res) => {
  try {
    console.log(`Attempting to delete user with ID: ${req.params.userId}`);
    const user = await User.findById(req.params.userId);
    if (!user) {
      console.log(`User not found with ID: ${req.params.userId}`);
      return res.status(404).json({ message: 'User not found' });
    }
    await User.deleteOne({ _id: req.params.userId });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
