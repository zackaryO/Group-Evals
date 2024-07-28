const express = require('express');
const router = express.Router();
const { getUsers, addUser, removeUser } = require('../controllers/userController');

// Route to get all users
router.get('/', getUsers);

// Route to add a new user
router.post('/add', addUser);

// Route to remove a user
router.delete('/:userId', removeUser);

module.exports = router;
