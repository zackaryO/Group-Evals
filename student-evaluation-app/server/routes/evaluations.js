const express = require('express');
const { submitEvaluation, getEvaluations } = require('../controllers/evaluationController');
const router = express.Router();

router.post('/submit', submitEvaluation);
router.get('/', getEvaluations);

module.exports = router;
