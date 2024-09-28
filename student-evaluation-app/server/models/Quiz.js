// server/models/Quiz.js
const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion' }],
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublished: { type: Boolean, default: false },
  allowMultipleSubmissions: { type: Boolean, default: false },
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  dueDate: { type: Date },
  allowLateSubmissions: { type: Boolean, default: true },
  latePenalty: Number, // Percentage to deduct per day
});

module.exports = mongoose.model('Quiz', QuizSchema);
