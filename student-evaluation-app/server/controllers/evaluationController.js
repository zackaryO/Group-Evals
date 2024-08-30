// student-evaluation-app\server\controllers\evaluationController.js
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
    const evaluations = await Evaluation.find().populate('presenter evaluator', 'username firstName lastName role');
    res.status(200).json(evaluations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteEvaluation = async (req, res) => {
  const { id } = req.params;
  try {
    const evaluation = await Evaluation.findByIdAndDelete(id);
    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' });
    }
    res.status(200).json({ message: 'Evaluation deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { submitEvaluation, getEvaluations, deleteEvaluation };
