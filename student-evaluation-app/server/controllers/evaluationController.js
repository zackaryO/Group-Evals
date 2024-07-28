const Evaluation = require('../models/Evaluation');

const submitEvaluation = async (req, res) => {
  const { presenter, evaluator, scores, comments, type } = req.body;
  try {
    if (!presenter || !evaluator || !scores || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    console.log('Received data:', req.body); // Log the incoming request data for debugging

    const evaluation = new Evaluation({ presenter, evaluator, scores, comments, type });
    await evaluation.save();
    res.status(201).json(evaluation);
  } catch (error) {
    console.error('Error:', error.message); // Log detailed error message
    res.status(400).json({ message: error.message });
  }
};

module.exports = { submitEvaluation };
