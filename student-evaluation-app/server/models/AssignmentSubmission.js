// student-evaluation-app/server/models/AssignmentSubmission.js
const mongoose = require('mongoose');

const AssignmentSubmissionSchema = new mongoose.Schema({
  assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  grade: { type: Number },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AssignmentSubmission', AssignmentSubmissionSchema);
