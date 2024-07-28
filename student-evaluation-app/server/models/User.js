const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  teamName: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  subject: { type: String }
});

module.exports = mongoose.model('User', UserSchema);
