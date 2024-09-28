// student-evaluation-app/server/controllers/evaluationController.js
const Evaluation = require('../models/Evaluation');
const Grade = require('../models/Grade');

const submitEvaluation = async (req, res) => {
  const {
    presenterId,
    evaluatorId,
    scores,
    comments,
    type,
    cohortId,
    courseId,
  } = req.body;

  try {
    const evaluation = new Evaluation({
      presenter: presenterId,
      evaluator: evaluatorId,
      scores,
      comments,
      type,
      cohort: cohortId,
      course: courseId,
    });

    await evaluation.save();

    // Calculate total score
    const totalScore =
      scores.area1 + scores.area2 + scores.area3 + scores.area4 + scores.extraCredit;

    // Save grade
    const grade = new Grade({
      student: presenterId,
      assessment: evaluation._id,
      assessmentModel: 'Evaluation',
      score: totalScore,
      course: courseId,
    });

    await grade.save();

    res.status(201).json({ message: 'Evaluation submitted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getEvaluations = async (req, res) => {
  try {
    const evaluations = await Evaluation.find()
      .populate('presenter', 'firstName lastName')
      .populate('evaluator', 'firstName lastName')
      .populate('cohort', 'name')
      .populate('course', 'title');

    res.status(200).json(evaluations);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteEvaluation = async (req, res) => {
  const { id } = req.params;
  try {
    const evaluation = await Evaluation.findByIdAndDelete(id);
    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' });
    }
    // Delete associated grade
    await Grade.findOneAndDelete({ assessment: id });
    res.status(200).json({ message: 'Evaluation deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { submitEvaluation, getEvaluations, deleteEvaluation };
