/**
 * @file Tool.js
 * @description Mongoose model for a Tool, including optional imageUrl and many-to-many references 
 *              to LoanerToolboxes. Also includes partnum, purchasePriority, location.room (drawer),
 *              and now an `expectedQuantity` field for tracking how many are *supposed* to exist.
 */

const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    partnum: { type: String },         // optional part number
    description: { type: String },
    imageUrl: { type: String },        // S3 or CloudFront file URL

    /** The actual count on hand. */
    quantityOnHand: { type: Number, default: 1 },

    /**
     * A new field to track how many are *supposed* to exist.
     * "missing" = expectedQuantity - quantityOnHand (if > 0).
     */
    expectedQuantity: { type: Number, default: 1 },

    location: {
      room: { type: String },         // "drawer" in the front-end
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
    /**
     * Many-to-many link: each Tool can appear in multiple LoanerToolboxes. 
     * This array references the toolbox _ids.
     */
    loanerToolboxes: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'LoanerToolbox' },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tool', toolSchema);
