const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  presenter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  evaluator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scores: {
    area1: { type: Number, required: true },
    area2: { type: Number, required: true },
    area3: { type: Number, required: true },
    area4: { type: Number, required: true },
    extraCredit: { type: Number, required: true }
  },
  comments: String,
  type: { type: String, enum: ['student', 'instructor'], required: true }
});

module.exports = mongoose.model('Evaluation', evaluationSchema);
