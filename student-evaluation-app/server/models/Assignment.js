// server/models/Assignment.js
const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: Date,
  isLocked: { type: Boolean, default: false },
  allowLateSubmission: { type: Boolean, default: true },
  latePenalty: Number, // Percentage to deduct per day
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Assignment', AssignmentSchema);
