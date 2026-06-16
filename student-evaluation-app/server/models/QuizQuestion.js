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
  // Optional stable identifier used by template-driven quizzes (e.g. the
  // mechanical aptitude test) to map a DB question to a specific spot in a
  // custom front-end flow without relying on array order. Ignored by ordinary
  // quizzes.
  key: { type: String },
  // Optional grouping label for template-driven quizzes (e.g. 'system1',
  // 'system3'). Lets the custom flow bucket questions into sections/phases.
  section: { type: String },
});

module.exports = mongoose.model('QuizQuestion', QuizQuestionSchema);
