// student-evaluation-app\server\models\QuizSubmission.js
const mongoose = require('mongoose');

const QuizSubmissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  score: { type: Number, required: true },
  answers: [
    {
      question: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion', required: true },
      selectedAnswer: { type: String, required: true },
      isCorrect: { type: Boolean, required: true }
    }
  ],
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('QuizSubmission', QuizSubmissionSchema);
