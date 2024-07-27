const Evaluation = require('../models/Evaluation');
const User = require('../models/User');

const submitEvaluation = async (req, res) => {
  const { presenter, evaluator, scores, comments, type } = req.body;
  try {
    const evaluation = new Evaluation({ presenter, evaluator, scores, comments, type });
    await evaluation.save();
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getEvaluations = async (req, res) => {
  try {
    const evaluations = await Evaluation.find().populate('presenter evaluator');
    res.json(evaluations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { submitEvaluation, getEvaluations };
