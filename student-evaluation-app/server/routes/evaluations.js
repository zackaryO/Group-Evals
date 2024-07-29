const express = require('express');
const router = express.Router();
const { submitEvaluation, getEvaluations, deleteEvaluation } = require('../controllers/EvaluationController');

// Routes for evaluations
router.post('/submit', submitEvaluation);
router.get('/', getEvaluations);
router.delete('/:id', deleteEvaluation);

module.exports = router;
