/**
 * FacilityNeed Model
 * Represents facility repair/improvement tasks.
 */

const mongoose = require('mongoose');

const facilityNeedSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }, // optional reference
    images: [{ type: String }], // S3 URLs
    dateReported: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FacilityNeed', facilityNeedSchema);
