// server/models/JobSearch.js
//
// One per student. Container for a student's job-search activity. Each
// student gets exactly one JobSearch (created on demand) with their target
// graduation date and overall placement status.

const mongoose = require('mongoose');

const JobSearchSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    graduationDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'placed', 'archived'],
      default: 'active',
    },
    placementDealership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealership',
      default: null,
    },
    placementApplication: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DealerApplication',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JobSearch', JobSearchSchema);
