/**
 * @file LoanerToolbox.js
 * @description Mongoose model for a LoanerToolbox, referencing multiple Tools in a many-to-many.
 *              Contains an array of "drawerImages" (S3 URLs) plus "tools" referencing Tool _ids.
 */

const mongoose = require('mongoose');

const loanerToolboxSchema = new mongoose.Schema(
  {
    toolboxName: { type: String, required: true },
    // Array of S3 URLs for drawer images (uploaded to S3)
    drawerImages: [{ type: String }],

    /**
     * Many-to-many link:
     * This toolbox can contain many Tools by _id. 
     * Each Tool also references this toolbox in "loanerToolboxes".
     */
    tools: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Tool' },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoanerToolbox', loanerToolboxSchema);
