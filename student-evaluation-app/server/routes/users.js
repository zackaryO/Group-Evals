/**
 * users.js (Express Router)
 *
 * This file defines routes for user CRUD operations, specifically for
 * administrators or instructors who need to manage (add, edit, delete) users.
 * It also automatically removes all quiz submissions, evaluations, and grade
 * documents tied to a user when that user is deleted.
 *
 * Important: Requires JWT authentication and role-based authorization
 * ('admin' or 'instructor') to perform these actions.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

// Models imported to allow us to remove associated data
const User = require('../models/User');
const QuizSubmission = require('../models/QuizSubmission');
const Evaluation = require('../models/Evaluation');
const Grade = require('../models/Grade');

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

/**
 * GET /api/users
 * Returns a list of all users (only accessible by 'admin' or 'instructor').
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  try {
    // You can also do a .populate('cohort', 'name') if you have cohorts
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/users/students
 * Returns a list of all users who have the 'student' role.
 * Only accessible by 'admin' or 'instructor'.
 */
router.get('/students', authenticateToken, authorizeRoles('admin', 'instructor', 'student'), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/users/add
 * Creates a new user record.
 * Requires 'username', 'password', 'role' (e.g., student or instructor).
 * Only accessible by 'admin' or 'instructor'.
 */
router.post('/add', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  const { username, password, role, teamName, firstName, lastName, subject, cohortId } = req.body;

  try {
    // Check if user already exists by username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the provided password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new user
    const newUser = new User({
      username,
      password: hashedPassword,
      role,
      teamName,
      firstName,
      lastName,
      subject,
      cohort: cohortId || null, // optional
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * PUT /api/users/:userId
 * Update user details by userId.
 * Allows changing username, role, teamName, firstName, lastName, subject,
 * and optionally password (if provided).
 * Only accessible by 'admin' or 'instructor'.
 */
router.put('/:userId', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  const { userId } = req.params;
  const { username, password, role, teamName, firstName, lastName, subject, cohortId } = req.body;

  try {
    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields if provided
    if (username !== undefined) {
      user.username = username;
    }
    if (role !== undefined) {
      user.role = role;
    }
    if (teamName !== undefined) {
      user.teamName = teamName;
    }
    if (firstName !== undefined) {
      user.firstName = firstName;
    }
    if (lastName !== undefined) {
      user.lastName = lastName;
    }
    if (subject !== undefined) {
      user.subject = subject;
    }

    // If password field is not blank, update it
    if (password) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      user.password = hashedPassword;
      console.log(`Password updated for user "${user.username}" (ID: ${userId})`);
    }

    // If you have cohorts to manage, handle them similarly:
    if (cohortId !== undefined) {
      user.cohort = cohortId;
    }

    // Save the updated user
    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * DELETE /api/users/:userId
 * Removes a user and all associated data:
 *  - Quiz Submissions in QuizSubmission collection
 *  - Evaluations in Evaluation collection (both as presenter & evaluator)
 *  - Grades in Grade collection
 * Only accessible by 'admin' or 'instructor'.
 */
router.delete('/:userId', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Attempting to delete user with ID: ${userId}`);

    // First, find the user in DB
    const user = await User.findById(userId);
    if (!user) {
      console.log(`User not found with ID: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove all quiz submissions for that user (as 'student')
    await QuizSubmission.deleteMany({ student: user._id });

    // Remove all evaluations where the user was the presenter or the evaluator
    await Evaluation.deleteMany({ $or: [{ presenter: user._id }, { evaluator: user._id }] });

    // Remove all grades referencing this user as a 'student'
    await Grade.deleteMany({ student: user._id });

    // Finally, remove the user itself
    await User.deleteOne({ _id: userId });

    console.log(`User with ID: ${userId} deleted successfully (including related data).`);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /api/users/:id/assign-cohort
 * Example route to assign a cohort to a student (if you use cohorts in your app).
 * Only accessible by 'admin' or 'instructor'.
 */
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
