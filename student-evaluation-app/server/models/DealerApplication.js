// server/models/DealerApplication.js
//
// One per (student, dealership) pair. Student-owned: dealer info is denormalized
// here so students can fully control their own research without writing to the
// shared master directory. The optional `linkedDealership` ref is what surfaces
// alumni info from the master directory in the UI when there's a match.
//
// Priority is implicit: it equals (sortIndex within the student's active list) + 1.
// We store an integer `sortIndex` for stable ordering and reorder via PUT /reorder.

const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    role: {
      type: String,
      enum: ['service_manager', 'service_director', 'shop_foreman', 'hr', 'other'],
      default: 'other',
    },
    customRoleLabel: { type: String, trim: true }, // used when role === 'other'
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    preferredChannel: {
      type: String,
      enum: ['email', 'phone', 'text', 'in_person', 'unknown'],
      default: 'unknown',
    },
    notes: { type: String, trim: true },
  },
  { _id: true, timestamps: true }
);

const BenefitsSchema = new mongoose.Schema(
  {
    relocation: {
      offered: { type: String, enum: ['Y', 'N', 'NA', 'unknown'], default: 'unknown' },
      details: { type: String, trim: true },
    },
    // PAY-RESTRICTED: stripped on read for non-self / non-staff. See utils/redactPay.js.
    startingWage: { type: Number, default: null },
    // PAY-RESTRICTED:
    wageRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
    },
    startingRole: {
      type: String,
      enum: ['tech', 'express_lane', 'porter', 'lot_tech', 'apprentice', 'other'],
      default: 'tech',
    },
    customStartingRoleLabel: { type: String, trim: true },
    pathwayNotes: { type: String, trim: true },
    mentorship: {
      offered: { type: Boolean, default: false },
      lengthMonths: { type: Number, default: null },
      details: { type: String, trim: true },
    },
    incentives: { type: String, trim: true },
    shopCulture: { type: String, trim: true },
    toolboxSupplied: {
      type: String,
      enum: ['Y', 'N', 'unknown'],
      default: 'unknown',
    },
  },
  { _id: false }
);

const LAST_EVENT_TYPES = [
  'none',
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

const NEXT_STEP_TYPES = [
  'none',
  'send_resume',
  'send_cover_letter',
  'submit_application',
  'follow_up_email',
  'follow_up_phone',
  'schedule_interview',
  'attend_interview',
  'send_thank_you',
  'await_response',
  'await_offer',
  'evaluate_offer',
  'other',
];

const DealerApplicationSchema = new mongoose.Schema(
  {
    jobSearch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobSearch',
      required: true,
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Optional link to master directory (for alumni cross-ref only). Student owns
    // the displayed dealer info regardless of whether this is set.
    linkedDealership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dealership',
      default: null,
    },

    // Denormalized dealer info (student types this).
    dealerName: { type: String, required: true, trim: true },
    dealerCity: { type: String, trim: true },
    dealerState: { type: String, trim: true },
    dealerAddress: { type: String, trim: true },
    dealerWebsite: { type: String, trim: true },
    dealerMainPhone: { type: String, trim: true },

    // Embedded contacts (per-application, not shared).
    contacts: { type: [ContactSchema], default: [] },

    // Priority is index + 1 within active+sorted list. We store sortIndex for ordering.
    sortIndex: { type: Number, default: 0, index: true },

    stillInterested: { type: Boolean, default: true },
    archivedAsStagnant: { type: Boolean, default: false },

    hasPostedJob: { type: String, enum: ['Y', 'N', 'unknown'], default: 'unknown' },
    applicationSubmitted: { type: Boolean, default: false },
    applicationSubmittedAt: { type: Date, default: null },

    benefits: { type: BenefitsSchema, default: () => ({}) },

    lastEventType: { type: String, enum: LAST_EVENT_TYPES, default: 'none' },
    lastEventAt: { type: Date, default: null },
    nextStepType: { type: String, enum: NEXT_STEP_TYPES, default: 'none' },
    nextStepNotes: { type: String, trim: true },

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

DealerApplicationSchema.index({ student: 1, sortIndex: 1 });

// Expose enum lists so route validators / clients can stay in sync.
DealerApplicationSchema.statics.LAST_EVENT_TYPES = LAST_EVENT_TYPES;
DealerApplicationSchema.statics.NEXT_STEP_TYPES = NEXT_STEP_TYPES;

module.exports = mongoose.model('DealerApplication', DealerApplicationSchema);
