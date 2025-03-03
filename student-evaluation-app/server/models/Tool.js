/**
 * @file Tool.js
 * @description Mongoose model for a Tool, including optional imageUrl for the S3 location.
 */
const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String },  // We'll store the S3 file URL here
    quantityOnHand: { type: Number, default: 0 },
    location: {
      room: { type: String },
      shelf: { type: String },
    },
    repairStatus: {
      type: String,
      enum: ['Good', 'Needs Repair', 'Under Repair'],
      default: 'Good',
    },
    purchasePriority: {
      type: String,
      enum: ['None', 'Low', 'Medium', 'High'],
      default: 'None',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tool', toolSchema);
