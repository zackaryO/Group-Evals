const Evaluation = require('../models/Evaluation');

const submitEvaluation = async (req, res) => {
  const { presenter, evaluator, scores, comments, type } = req.body;
  try {
    const newEvaluation = new Evaluation({ presenter, evaluator, scores, comments, type });
    await newEvaluation.save();
    res.status(201).json(newEvaluation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getEvaluations = async (req, res) => {
  try {
    const evaluations = await Evaluation.find().populate('presenter evaluator', 'username firstName lastName');
    res.status(200).json(evaluations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { submitEvaluation, getEvaluations };
