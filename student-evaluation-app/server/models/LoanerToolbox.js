/**
 * LoanerToolbox Model
 * Represents a loaner toolbox and the tools within its drawers.
 */

const mongoose = require('mongoose');

const loanerToolboxSchema = new mongoose.Schema(
  {
    toolboxName: { type: String, required: true },
    drawerImages: [{ type: String }], // Array of S3 URLs for drawer images
    tools: [
      {
        name: String,
        description: String,
        quantity: { type: Number, default: 1 },
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
        imageUrl: String, // S3 URL for the individual tool
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoanerToolbox', loanerToolboxSchema);
