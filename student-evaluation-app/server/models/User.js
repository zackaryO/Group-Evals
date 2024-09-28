// server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  teamName: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  subject: { type: String },
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', default: null },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
});

module.exports = mongoose.model('User', UserSchema);
