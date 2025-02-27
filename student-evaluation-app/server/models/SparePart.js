/**
 * SparePart Model
 * Represents spare parts inventory.
 */

const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema(
  {
    partName: { type: String, required: true },
    partNumber: { type: String },
    description: { type: String },
    imageUrl: { type: String }, // S3 URL
    location: {
      room: { type: String },
      shelf: { type: String },
    },
    quantityOnHand: { type: Number, default: 0 },
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

module.exports = mongoose.model('SparePart', sparePartSchema);
