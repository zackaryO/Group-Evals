// student-evaluation-app/server/controllers/userController.js
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Cohort = require('../models/Cohort');

// Add a new user
const addUser = async (req, res) => {
  const { username, password, role, teamName, firstName, lastName, subject, cohortId } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserData = {
      username,
      password: hashedPassword,
      role,
      teamName,
      firstName,
      lastName,
      subject,
    };

    // Assign cohort if cohortId is provided
    if (cohortId) {
      newUserData.cohort = cohortId;
    }

    const newUser = new User(newUserData);
    await newUser.save();

    // Add user to cohort's student list if role is 'student' and cohortId is provided
    if (role === 'student' && cohortId) {
      await Cohort.findByIdAndUpdate(cohortId, { $push: { students: newUser._id } });
    }

    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a user
const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { username, password, role, teamName, firstName, lastName, subject, cohortId } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    user.username = username || user.username;
    user.role = role || user.role;
    user.teamName = teamName || user.teamName;
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.subject = subject || user.subject;

    // Update cohort association if provided
    if (cohortId) {
      // Remove user from previous cohort if applicable
      if (user.cohort && user.cohort.toString() !== cohortId) {
        await Cohort.findByIdAndUpdate(user.cohort, { $pull: { students: user._id } });
      }
      user.cohort = cohortId;
      await Cohort.findByIdAndUpdate(cohortId, { $addToSet: { students: user._id } });
    } else if (user.role === 'student') {
      // If cohortId is not provided and user is a student, remove from existing cohort
      if (user.cohort) {
        await Cohort.findByIdAndUpdate(user.cohort, { $pull: { students: user._id } });
        user.cohort = null;
      }
    }

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getUsers, addUser, updateUser, removeUser };
