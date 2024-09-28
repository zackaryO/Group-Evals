// student-evaluation-app/server/models/Course.js

const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort' },
  assessments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' }],
  // Added weighting factors
  weightingFactors: {
    quiz: { type: Number, default: 1 },
    assignment: { type: Number, default: 1 },
    evaluation: { type: Number, default: 1 },
  },
});

module.exports = mongoose.model('Course', CourseSchema);
