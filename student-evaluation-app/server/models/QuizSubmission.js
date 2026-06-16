// server/models/QuizSubmission.js
const mongoose = require('mongoose');

const QuizSubmissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number },
  answers: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion', required: true },
      selectedAnswer: { type: String },
      typedAnswer: { type: String },
      isCorrect: { type: Boolean },
      pointsAwarded: { type: Number },
    },
  ],
  // True when the submission contains free-response (open-ended) answers that an
  // instructor still has to grade by hand. Set at submit time and cleared once
  // every open-ended answer has points awarded. Ordinary all-multiple-choice
  // quizzes leave this false.
  needsGrading: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('QuizSubmission', QuizSubmissionSchema);
