// server/models/Communication.js
//
// Timeline event on a DealerApplication. The application's lastEventType /
// lastEventAt fields are updated by the route handler whenever a Communication
// is created/edited/deleted, so stagnation can be computed without a join.

const mongoose = require('mongoose');

const COMMUNICATION_TYPES = [
  'application_submitted',
  'cover_letter_sent',
  'email_sent',
  'email_received',
  'phone',
  'text',
  'virtual_meeting',
  'in_person',
  'interview',
  'offer_received',
  'rejection',
  'other',
];

const CommunicationSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DealerApplication',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: COMMUNICATION_TYPES, required: true },
    occurredAt: { type: Date, required: true, default: () => new Date() },

    // Loose ref into application.contacts[] (sub-doc _id) so we know who the
    // student spoke with. Not a hard ref because contacts live embedded.
    contactId: { type: mongoose.Schema.Types.ObjectId, default: null },
    contactNameSnapshot: { type: String, trim: true }, // copy at log time

    summary: { type: String, trim: true },

    // PAY-RESTRICTED: stripped on read for non-self / non-staff.
    // Only meaningful on type === 'offer_received'.
    offerAmount: { type: Number, default: null },

    attachmentKeys: [{ type: String }], // S3 keys
  },
  { timestamps: true }
);

CommunicationSchema.statics.COMMUNICATION_TYPES = COMMUNICATION_TYPES;

module.exports = mongoose.model('Communication', CommunicationSchema);
