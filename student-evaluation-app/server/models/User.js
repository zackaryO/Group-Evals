// server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, },
  password: { type: String, required: true },
  // Roles: 'admin' | 'instructor' | 'student' | 'electrical_instructor' | 'electrical_student'
  role: { type: String, required: true },
  teamName: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  subject: { type: String },
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', default: null },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  isActive: { type: Boolean, default: true },
  // For 'electrical_student' users: the instructor (electrical_instructor or a
  // full instructor) who created them. Scopes which roster a student belongs to
  // — an electrical instructor may only see/manage students they added.
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

module.exports = mongoose.model('User', UserSchema);
