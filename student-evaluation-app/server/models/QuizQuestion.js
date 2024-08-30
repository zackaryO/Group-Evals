// student-evaluation-app\server\models\QuizQuestion.js
const mongoose = require('mongoose');

const QuizQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
});

module.exports = mongoose.model('QuizQuestion', QuizQuestionSchema);
