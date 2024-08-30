// student-evaluation-app\server\routes\evaluations.js
const express = require('express');
const router = express.Router();
const { submitEvaluation, getEvaluations, deleteEvaluation } = require('../controllers/evaluationController');

// Routes for evaluations
router.post('/submit', submitEvaluation);
router.get('/', getEvaluations);
router.delete('/:id', deleteEvaluation);

module.exports = router;
