const express = require('express');
const router = express.Router();
const { getAreas, setAreas, updateAreas } = require('../controllers/areaController');

router.get('/', getAreas);
router.post('/set', setAreas);
router.put('/update', updateAreas);

module.exports = router;
