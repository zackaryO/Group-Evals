/**
 * @file Tool.js
 * @description Mongoose model for a Tool, including optional imageUrl and many-to-many references 
 *              to LoanerToolboxes. Also includes partnum, purchasePriority, and location.room (drawer).
 */

const mongoose = require('mongoose');

const toolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    partnum: { type: String },         // optional: not used in front-end currently
    description: { type: String },
    imageUrl: { type: String },        // S3 or CloudFront file URL
    quantityOnHand: { type: Number, default: 1 },
    location: {
      room: { type: String },         // "drawer" in the front-end
      shelf: { type: String },
    },
    repairStatus: {
      type: String,
      enum: ['Good', 'Needs Repair', 'Under Repair'],
      default: 'Good',
    },
    purchasePriority: {               // optional: not used in the two-list UI
      type: String,
      enum: ['None', 'Low', 'Medium', 'High'],
      default: 'None',
    },
    /**
     * Many-to-many link: 
     * Each Tool can appear in multiple LoanerToolboxes. 
     * This array references the toolbox _ids.
     */
    loanerToolboxes: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'LoanerToolbox' },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tool', toolSchema);
