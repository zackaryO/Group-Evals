const express = require('express');
const { addUser, removeUser, getUsers } = require('../controllers/userController');
const router = express.Router();

router.post('/add', addUser);
router.delete('/remove/:id', removeUser);
router.get('/', getUsers);

module.exports = router;
