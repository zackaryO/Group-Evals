const express = require('express');
const { setEvaluationAreas, getEvaluationAreas } = require('../controllers/areaController');
const router = express.Router();

router.post('/set', setEvaluationAreas);
router.get('/', getEvaluationAreas);

module.exports = router;
