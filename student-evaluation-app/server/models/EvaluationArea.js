const mongoose = require('mongoose');

const AreaSchema = new mongoose.Schema({
  area1: { type: String, required: true },
  area2: { type: String, required: true },
  area3: { type: String, required: true },
  area4: { type: String, required: true }
});

module.exports = mongoose.model('Area', AreaSchema);
