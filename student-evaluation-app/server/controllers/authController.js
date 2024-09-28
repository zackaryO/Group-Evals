// student-evaluation-app\server\controllers\authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Hard-coded secret key for JWT puy in .env gitignore using a proper key
const JWT_SECRET = 'my_super_secret_key';

const register = async (req, res) => {
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
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    // const user = await User.findOne({ cohort, username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { _id: user._id, username: user.username, role: user.role } });
    // res.json({ token, user: { _id: user._id, username: user.username, role: user.role, cohort: user.cohort } });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { register, login };
