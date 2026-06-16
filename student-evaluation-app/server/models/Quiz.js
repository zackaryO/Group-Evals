// server/models/Quiz.js
const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  // Optional special-flow marker. When set (e.g. 'mechanical-aptitude'), the
  // student take-quiz UI launches a custom staged experience instead of the
  // generic flat form. null for ordinary quizzes.
  template: { type: String, default: null },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuizQuestion' }],
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublished: { type: Boolean, default: false },
  allowMultipleSubmissions: { type: Boolean, default: false },
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  dueDate: { type: Date },
  allowLateSubmissions: { type: Boolean, default: true },
  latePenalty: Number, // Percentage to deduct per day
  // Admin/full-instructor flag marking this quiz as a shared resource that ANY
  // electrical instructor may edit and assign to their electrical students
  // (e.g. "A6 ASE practice 1"). Set via PUT /:quizId/shared-electrical.
  sharedWithElectrical: { type: Boolean, default: false },
  // The electrical instructors (or full instructors acting in that capacity)
  // who have assigned this quiz to their own electrical-student roster. An
  // electrical student sees a quiz iff the instructor who added them appears
  // here. This is independent of `isPublished`, which governs the regular
  // (non-electrical) student view.
  electricalAssignedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

module.exports = mongoose.model('Quiz', QuizSchema);
