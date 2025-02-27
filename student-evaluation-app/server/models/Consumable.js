/**
 * Consumable Model
 * Represents consumable items in inventory.
 */

const mongoose = require('mongoose');

const consumableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageUrl: { type: String }, // S3 URL
    location: {
      room: { type: String },
      shelf: { type: String },
    },
    quantityOnHand: { type: Number, default: 0 },
    desiredQuantity: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Consumable', consumableSchema);
