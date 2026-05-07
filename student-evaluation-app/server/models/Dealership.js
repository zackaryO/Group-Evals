// server/models/Dealership.js
//
// Master, instructor-curated dealership directory used as a *supplemental* reference
// by students researching MB dealerships. Students do NOT write to this collection
// (their per-application dealer info lives on DealerApplication). The main value
// here is tracking alumni who have worked at each dealer so currently-job-searching
// students can see where peers landed.

const mongoose = require('mongoose');

const AlumniEntrySchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    gradYear: { type: String, trim: true },
    currentlyEmployed: { type: Boolean, default: false },
    role: { type: String, trim: true },
    contactInfo: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: true, timestamps: true }
);

const DealershipSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    mainPhone: { type: String, trim: true },
    notes: { type: String, trim: true },
    alumni: { type: [AlumniEntrySchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DealershipSchema.index({ name: 'text', city: 'text', state: 'text' });

module.exports = mongoose.model('Dealership', DealershipSchema);
