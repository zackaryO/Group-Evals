// server/models/QuizQuestion.js
const mongoose = require('mongoose');

const QuizQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [String],
  correctAnswer: { type: String },
  image: { type: String }, // <-- Note: Just set type: String
  questionType: {
    type: String,
    enum: ['multiple-choice', 'open-ended'],
    default: 'multiple-choice',
  },
});

module.exports = mongoose.model('QuizQuestion', QuizQuestionSchema);
