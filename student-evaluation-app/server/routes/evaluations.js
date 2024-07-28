const express = require('express');
const router = express.Router();
const { submitEvaluation, getEvaluations } = require('../controllers/evaluationController');

router.post('/submit', submitEvaluation);
router.get('/', getEvaluations);

module.exports = router;
