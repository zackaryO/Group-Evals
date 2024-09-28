// server/models/Grade.js
const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'assessmentModel',
    required: true,
  },
  assessmentModel: {
    type: String,
    required: true,
    enum: ['Quiz', 'Assignment', 'Evaluation'],
  },
  score: { type: Number, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
});

module.exports = mongoose.model('Grade', GradeSchema);

