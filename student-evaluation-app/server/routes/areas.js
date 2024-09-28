// student-evaluation-app/server/routes/areas.js
const express = require('express');
const router = express.Router();
const { getAreas, setAreas, updateAreas } = require('../controllers/areaController');

// Route to get areas
router.get('/', getAreas);

// Route to set areas
router.post('/set', setAreas);

// Route to update areas
router.put('/update', updateAreas);

module.exports = router;
