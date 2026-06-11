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
const Cohort = require('../models/Cohort');
const QuizSubmission = require('../models/QuizSubmission');
const Evaluation = require('../models/Evaluation');
const Grade = require('../models/Grade');
// NOTE: Job-search data (JobSearch, DealerApplication, Communication, master
// Dealership records the student created) is intentionally NOT cascaded on
// user delete. Per project decision, dealer-related history is preserved when
// a student is removed so the shared dealer directory and their job-search
// trail remain available for future cohorts and instructor reference.

const {
  authenticateToken,
  authorizeRoles,
  isFullInstructor,
} = require('../middleware/authMiddleware');

/**
 * Load a user the caller is allowed to mutate.
 *  - Full instructors (instructor/admin): may act on any user.
 *  - Electrical instructors: may act ONLY on electrical_student users they
 *    themselves added (addedBy === their id).
 * Sends the appropriate 404/403 response and returns null on failure; returns
 * the user document on success.
 */
async function loadManageableUser(req, res, userId) {
  const target = await User.findById(userId);
  if (!target) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }
  if (!isFullInstructor(req.user.role)) {
    // electrical_instructor: roster-scoped.
    if (target.role !== 'electrical_student' || String(target.addedBy) !== String(req.user.id)) {
      res.status(403).json({ message: 'Not authorized to manage this user.' });
      return null;
    }
  }
  return target;
}

/**
 * GET /api/users/electrical-students
 * Returns electrical_student users. Electrical instructors see only the roster
 * they added; full instructors see all electrical students.
 */
router.get(
  '/electrical-students',
  authenticateToken,
  authorizeRoles('admin', 'instructor', 'electrical_instructor'),
  async (req, res) => {
    try {
      const query = { role: 'electrical_student' };
      if (!isFullInstructor(req.user.role)) {
        query.addedBy = req.user.id;
      }
      const students = await User.find(query)
        .populate('addedBy', 'username firstName lastName')
        .sort({ lastName: 1, firstName: 1 });
      res.json(students);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * GET /api/users
 * Returns a list of all users (only accessible by 'admin' or 'instructor').
 */
router.get('/', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  try {
    const users = await User.find().populate('cohort', 'name isActive');
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
    const students = await User.find({ role: 'student' }).populate('cohort', 'name isActive');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/users/add
 * Creates a new user record.
 *  - Full instructors (instructor/admin): may create any role. When creating an
 *    'electrical_student', addedBy defaults to the creator (or an explicit
 *    body.addedBy electrical instructor).
 *  - Electrical instructors: may ONLY create 'electrical_student' users, always
 *    owned by themselves (addedBy = their id); cohort is ignored.
 */
router.post('/add', authenticateToken, authorizeRoles('admin', 'instructor', 'electrical_instructor'), async (req, res) => {
  const { username, password, role, teamName, firstName, lastName, subject, cohortId, addedBy } = req.body;

  try {
    // Check if user already exists by username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Resolve role / ownership based on the creator's tier.
    const callerIsFull = isFullInstructor(req.user.role);
    let effectiveRole = role;
    let effectiveAddedBy = null;
    let effectiveCohort = cohortId || null;

    if (!callerIsFull) {
      // Electrical instructor: locked to creating their own electrical students.
      effectiveRole = 'electrical_student';
      effectiveAddedBy = req.user.id;
      effectiveCohort = null;
    } else if (effectiveRole === 'electrical_student') {
      // Full instructor creating an electrical student: tie it to an electrical
      // instructor (explicit addedBy) or to themselves by default.
      effectiveAddedBy = addedBy || req.user.id;
      effectiveCohort = null;
    }

    // Hash the provided password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new user
    const newUser = new User({
      username,
      password: hashedPassword,
      role: effectiveRole,
      teamName,
      firstName,
      lastName,
      subject,
      cohort: effectiveCohort, // optional
      addedBy: effectiveAddedBy,
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
 *  - Full instructors (instructor/admin): may update any user, including role.
 *  - Electrical instructors: may update only their own electrical students, and
 *    may NOT change the role (role/cohort changes are ignored for them).
 */
router.put('/:userId', authenticateToken, authorizeRoles('admin', 'instructor', 'electrical_instructor'), async (req, res) => {
  const { userId } = req.params;
  const { username, password, role, teamName, firstName, lastName, subject, cohortId } = req.body;
  const callerIsFull = isFullInstructor(req.user.role);

  try {
    // Find the user by ID (roster-scoped for electrical instructors).
    const user = await loadManageableUser(req, res, userId);
    if (!user) return; // response already sent

    // Update fields if provided
    if (username !== undefined) {
      user.username = username;
    }
    // Only full instructors may change a user's role.
    if (role !== undefined && callerIsFull) {
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

    // If you have cohorts to manage, handle them similarly (full instructors only).
    if (cohortId !== undefined && callerIsFull) {
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
 *  - Full instructors (instructor/admin): may delete any user.
 *  - Electrical instructors: may delete only their own electrical students.
 */
router.delete('/:userId', authenticateToken, authorizeRoles('admin', 'instructor', 'electrical_instructor'), async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log(`Attempting to delete user with ID: ${userId}`);

    // Find the user in DB (roster-scoped for electrical instructors).
    const user = await loadManageableUser(req, res, userId);
    if (!user) return; // response already sent

    // Remove all quiz submissions for that user (as 'student')
    await QuizSubmission.deleteMany({ student: user._id });

    // Remove all evaluations where the user was the presenter or the evaluator
    await Evaluation.deleteMany({ $or: [{ presenter: user._id }, { evaluator: user._id }] });

    // Remove all grades referencing this user as a 'student'
    await Grade.deleteMany({ student: user._id });

    // Job-search data (JobSearch / DealerApplication / Communication / shared
    // Dealership records this user created) is preserved by design.

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
 * Assign (or unassign with cohortId=null/'') a cohort to a student. Keeps the
 * Cohort.students array in sync on both the previous and new cohort.
 * Only accessible by 'admin' or 'instructor'.
 */
router.put('/:id/assign-cohort', authenticateToken, authorizeRoles('admin', 'instructor'), async (req, res) => {
  const { cohortId } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }
    const newCohortId = cohortId || null;
    if (user.cohort && String(user.cohort) !== String(newCohortId)) {
      await Cohort.findByIdAndUpdate(user.cohort, { $pull: { students: user._id } });
    }
    if (newCohortId) {
      await Cohort.findByIdAndUpdate(newCohortId, { $addToSet: { students: user._id } });
    }
    user.cohort = newCohortId;
    await user.save();
    res.json({ message: 'Cohort assigned to student successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/users/:id/active
 * Toggle a user's isActive flag. Inactive students still log in and use the
 * app, but instructor views render them greyed out.
 *  - Full instructors (instructor/admin): any user.
 *  - Electrical instructors: only their own electrical students.
 */
router.put('/:id/active', authenticateToken, authorizeRoles('admin', 'instructor', 'electrical_instructor'), async (req, res) => {
  try {
    const user = await loadManageableUser(req, res, req.params.id);
    if (!user) return; // response already sent
    user.isActive = !!req.body.isActive;
    await user.save();
    res.json({ _id: user._id, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
