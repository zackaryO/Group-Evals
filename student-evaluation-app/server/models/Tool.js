/**
 * @file Tool.js
 * @description Mongoose model for storing tool/equipment information, including optional imageUrl for S3.
 */

const mongoose = require('mongoose');

/**
 * Tool Schema
 * @property {String} name - The name of the tool (required).
 * @property {String} description - Optional longer text description.
 * @property {String} imageUrl - URL to the tool image stored in AWS S3.
 * @property {Number} quantityOnHand - Current inventory count.
 * @property {Object} location - Nested object with "room" and "shelf" for physical location.
 * @property {String} repairStatus - Must be one of "Good", "Needs Repair", or "Under Repair".
 * @property {String} purchasePriority - Must be one of "None", "Low", "Medium", "High".
 */
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
