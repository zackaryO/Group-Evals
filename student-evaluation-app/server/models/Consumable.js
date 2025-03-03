/**
 * @file Consumable.js
 * @description Mongoose model for Consumable items, with an optional S3 imageUrl.
 */

const mongoose = require('mongoose');

const consumableSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    imageUrl: { type: String },
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
