const User = require('../models/User');

const addUser = async (req, res) => {
  const { username, password, role, teamName, firstName, lastName, subject } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role, teamName, firstName, lastName, subject });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const removeUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { addUser, removeUser };
