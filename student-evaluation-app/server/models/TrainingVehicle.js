/**
 * TrainingVehicle Model
 * Represents a training vehicle with needed repairs, parts, etc.
 */

const mongoose = require('mongoose');

const trainingVehicleSchema = new mongoose.Schema(
  {
    year: Number,
    make: String,
    model: String,
    vin: { type: String, unique: true },
    roNumber: String,
    engineCode: String,
    transmissionCode: String,
    mileage: Number,
    baumuster: String,
    repairsNeeded: { type: String }, // or an array if you prefer
    partsNeeded: { type: String },   // or an array if you prefer
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrainingVehicle', trainingVehicleSchema);
