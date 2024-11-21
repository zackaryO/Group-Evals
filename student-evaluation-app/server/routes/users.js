// student-evaluation-app/server/routes/users.js
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Route to get all users (accessible by admin or instructor)
router.get('/', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  try {
    const users = await User.find().populate('cohort', 'name');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Route to get only student users (accessible by admin or instructor)
router.get('/students', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).populate('cohort', 'name');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Route to add a new user (accessible by admin or instructor)
router.post('/add', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  const { username, password, role, teamName, firstName, lastName, subject, cohortId } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      role,
      teamName,
      firstName,
      lastName,
      subject,
      cohort: cohortId,
    });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Route to remove a user (accessible by admin only)
router.delete('/:userId', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
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

// Assign cohort to a user (accessible by admin or instructor)
router.put('/:id/assign-cohort', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  const { cohortId } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }
    user.cohort = cohortId;
    await user.save();
    res.json({ message: 'Cohort assigned to student successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
