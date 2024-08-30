// student-evaluation-app/server/models/Quiz.js
const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion' }],
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublished: { type: Boolean, default: false },
  allowMultipleSubmissions: { type: Boolean, default: false }, // New field
});

module.exports = mongoose.model('Quiz', QuizSchema);
