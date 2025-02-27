/**
 * Tool Model
 * Represents tools/equipment in the main tool room/storage.
 */

const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String }, // S3 URL
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
