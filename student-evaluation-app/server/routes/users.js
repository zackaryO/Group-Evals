const express = require('express');
const { addUser, removeUser } = require('../controllers/userController');
const router = express.Router();

router.post('/add', addUser);
router.delete('/remove/:id', removeUser);

module.exports = router;
