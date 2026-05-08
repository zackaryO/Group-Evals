// server/routes/jobSearch.js
//
// Routes for the student job-search tracker:
//   - JobSearch (per-student container)
//   - DealerApplication CRUD (priority list, benefits, contacts)
//   - Communication log (timeline events on an application)
//   - Class summary board (visible to all authenticated users)
//   - Activity-timeline PDF export
//
// Pay-related fields are stripped via utils/redactPay.js. Stagnation is computed
// at read time via utils/computeStagnation.js. Follow-up hints come from
// utils/followupSuggestion.js.

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');

const JobSearch = require('../models/JobSearch');
const DealerApplication = require('../models/DealerApplication');
const Communication = require('../models/Communication');
const Dealership = require('../models/Dealership');
const User = require('../models/User');
// Eagerly register Cohort so .populate('cohort', ...) works in tests/standalone.
require('../models/Cohort');

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const {
  redactApplication,
  redactCommunication,
  redactBoardEntry,
  isStaff,
} = require('../utils/redactPay');
const { computeStagnation, countActive } = require('../utils/computeStagnation');
const { followupSuggestion } = require('../utils/followupSuggestion');
const { followUpUrgency, ENGAGEMENT_TYPES } = require('../utils/followUpUrgency');

const STAFF = ['instructor', 'admin'];

// -------- Helpers ----------------------------------------------------------

// Self-heal for legacy data: prior to the highlighted "cover letter / resume
// sent" toggle, only an 'application_submitted' communication flipped the
// applicationSubmitted flag. Apps where the student logged a
// 'cover_letter_sent' but never toggled the new prompt should still display
// as Sent and start the follow-up clock from that event. Returns the same
// object reference if no heal is needed, otherwise a shallow clone with the
// fields filled in.
function selfHealCoverLetterSent(app) {
  if (!app) return app;
  const milestoneLastType = app.lastEventType === 'cover_letter_sent' || app.lastEventType === 'application_submitted';
  if (!milestoneLastType || !app.lastEventAt || app.applicationSubmitted) return app;
  return {
    ...app,
    applicationSubmitted: true,
    applicationSubmittedAt: app.applicationSubmittedAt || app.lastEventAt,
  };
}

// Decorate an application object with computed (non-persisted) fields the UI uses.
function decorateApplication(app, viewer) {
  app = selfHealCoverLetterSent(app);
  const stagnation = computeStagnation(app);
  const followup = followupSuggestion(app);
  const urgency = followUpUrgency(app);
  return {
    ...app,
    isStagnant: stagnation.isStagnant,
    daysSinceLastEvent: stagnation.daysSinceLastEvent,
    followupSuggestion: followup ? followup.suggestion : null,
    followupUrgency: followup ? followup.urgency : null,
    followUpUrgency: urgency,
  };
}

// When linkedDealership is populated (i.e. it's an object, not just an
// ObjectId), the master Dealership is the canonical source of truth for
// dealer info. Override the application's denormalized snapshot so every
// student linked to the same dealer sees the same name/address/etc., even
// if their snapshot was taken before another student updated the master.
function preferMasterDealerFields(app) {
  if (!app || !app.linkedDealership || typeof app.linkedDealership !== 'object') return app;
  const d = app.linkedDealership;
  if (d.name != null) app.dealerName = d.name;
  if (d.city != null) app.dealerCity = d.city;
  if (d.state != null) app.dealerState = d.state;
  if (d.address != null) app.dealerAddress = d.address;
  if (d.website != null) app.dealerWebsite = d.website;
  if (d.mainPhone != null) app.dealerMainPhone = d.mainPhone;
  return app;
}

function shapeApplication(app, viewer) {
  return decorateApplication(redactApplication(viewer, preferMasterDealerFields(app)), viewer);
}

// Find or create the JobSearch container for a student. Uses upsert so two
// concurrent requests (e.g. MyJobSearch fires GET /me and GET /applications in
// parallel) can't both try to create it and trip the unique-on-student index.
async function getOrCreateJobSearch(studentId) {
  return JobSearch.findOneAndUpdate(
    { student: studentId },
    { $setOnInsert: { student: studentId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Find a master Dealership matching a name (case-insensitive, trimmed) and
// optional city; create one if none exists. Used to dedupe shared dealerships
// across students so two applications to "MB of Salt Lake City" point at the
// same Dealership record.
async function findOrCreateDealership({ name, city, state, address, website, mainPhone, createdBy }) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  // Case-insensitive exact-name match, optionally narrowed by city when the
  // student provided one. We don't fuzzy-match — that's surfaced via the
  // search-as-you-type UI, where the student can pick an existing record.
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = { name: new RegExp(`^${escaped}$`, 'i') };
  if (city && city.trim()) filter.city = new RegExp(`^${city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  let dealer = await Dealership.findOne(filter);
  if (!dealer) {
    dealer = await Dealership.create({
      name: trimmed,
      city: city || undefined,
      state: state || undefined,
      address: address || undefined,
      website: website || undefined,
      mainPhone: mainPhone || undefined,
      createdBy,
      updatedBy: createdBy,
    });
  }
  return dealer;
}

// Authorization for application-modifying routes: must be the owning student
// or staff. Returns the application or sends an error and returns null.
async function loadOwnedApplication(req, res) {
  const app = await DealerApplication.findById(req.params.id);
  if (!app) {
    res.status(404).json({ message: 'Application not found' });
    return null;
  }
  const isOwner = String(app.student) === String(req.user.id);
  if (!isOwner && !isStaff(req.user)) {
    res.status(403).json({ message: 'Not allowed' });
    return null;
  }
  return app;
}

// -------- JobSearch container ---------------------------------------------

// GET /api/job-search/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const js = await getOrCreateJobSearch(req.user.id);
    res.json(js);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/job-search/me  (update graduationDate, status)
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const js = await getOrCreateJobSearch(req.user.id);
    if (req.body.graduationDate !== undefined) js.graduationDate = req.body.graduationDate || null;
    if (req.body.status !== undefined && ['active', 'placed', 'archived'].includes(req.body.status)) {
      js.status = req.body.status;
    }
    if (req.body.placementApplication !== undefined) js.placementApplication = req.body.placementApplication;
    if (req.body.placementDealership !== undefined) js.placementDealership = req.body.placementDealership;
    await js.save();
    res.json(js);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/job-search/student/:studentId   (staff or self)
// Returns { jobSearch, student } so callers (e.g. the staff-impersonation
// banner in MyJobSearch) can label whose record is being viewed without a
// second round-trip.
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const sid = req.params.studentId;
    if (String(sid) !== String(req.user.id) && !isStaff(req.user)) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    const studentDoc = await User.findById(sid).select('_id firstName lastName username role').lean();
    if (!studentDoc) return res.status(404).json({ message: 'Student not found' });
    // Use the upsert helper so we don't trip the unique index under concurrent calls.
    const js = await getOrCreateJobSearch(sid);
    res.json({ jobSearch: js.toObject ? js.toObject() : js, student: studentDoc });
  } catch (err) {
    console.error('GET /api/job-search/student/:studentId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// -------- Applications -----------------------------------------------------

// GET /api/job-search/applications        (list current user's applications)
// GET /api/job-search/applications?student=<id>   (staff override or self)
router.get('/applications', authenticateToken, async (req, res) => {
  try {
    const studentParam = req.query.student;
    let studentId = req.user.id;
    if (studentParam && String(studentParam) !== String(req.user.id)) {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not allowed' });
      studentId = studentParam;
    }
    const apps = await DealerApplication.find({ student: studentId })
      .populate('linkedDealership')
      .sort({ sortIndex: 1, createdAt: 1 })
      .lean();
    const out = apps.map((a) => shapeApplication(a, req.user));
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/job-search/applications/:id
router.get('/applications/:id', authenticateToken, async (req, res) => {
  try {
    const app = await DealerApplication.findById(req.params.id).populate('linkedDealership').lean();
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json(shapeApplication(app, req.user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/job-search/applications
// Body may include { student } to create on behalf of another user (staff only).
// Without `student`, creates for the requesting user.
//
// Dealership de-dup: if `linkedDealership` is provided, we use it directly.
// Otherwise we find-or-create a shared Dealership matching the name (and city
// if given). Two students applying to the same dealer end up linked to one
// shared record so other students can find it via the search-as-you-type UI.
router.post('/applications', authenticateToken, async (req, res) => {
  try {
    const data = req.body || {};
    let studentId = req.user.id;
    if (data.student && String(data.student) !== String(req.user.id)) {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not allowed' });
      studentId = data.student;
    }
    if (!data.dealerName || !data.dealerName.trim()) {
      return res.status(400).json({ message: 'dealerName is required' });
    }
    const js = await getOrCreateJobSearch(studentId);
    const existingCount = await DealerApplication.countDocuments({ student: studentId });

    // Resolve the shared Dealership record either from an explicit link or by
    // find-or-create on (name, city).
    let linkedDealership = null;
    if (data.linkedDealership) {
      const found = await Dealership.findById(data.linkedDealership);
      if (found) linkedDealership = found;
    }
    if (!linkedDealership) {
      linkedDealership = await findOrCreateDealership({
        name: data.dealerName,
        city: data.dealerCity,
        state: data.dealerState,
        address: data.dealerAddress,
        website: data.dealerWebsite,
        mainPhone: data.dealerMainPhone,
        createdBy: req.user.id,
      });
    }

    const app = await DealerApplication.create({
      jobSearch: js._id,
      student: studentId,
      linkedDealership: linkedDealership ? linkedDealership._id : null,
      // Keep denormalized fields as a snapshot of what the student saw at
      // creation time — the canonical truth lives on the linked Dealership.
      dealerName: linkedDealership ? linkedDealership.name : data.dealerName.trim(),
      dealerCity: linkedDealership ? linkedDealership.city : data.dealerCity,
      dealerState: linkedDealership ? linkedDealership.state : data.dealerState,
      dealerAddress: linkedDealership ? linkedDealership.address : data.dealerAddress,
      dealerWebsite: linkedDealership ? linkedDealership.website : data.dealerWebsite,
      dealerMainPhone: linkedDealership ? linkedDealership.mainPhone : data.dealerMainPhone,
      contacts: Array.isArray(data.contacts) ? data.contacts : [],
      sortIndex: existingCount, // append
      stillInterested: data.stillInterested !== false,
      hasPostedJob: data.hasPostedJob || 'unknown',
      benefits: data.benefits || {},
      notes: data.notes,
    });
    const populated = await DealerApplication.findById(app._id).populate('linkedDealership').lean();
    res.status(201).json(shapeApplication(populated, req.user));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/job-search/applications/:id
const APPLICATION_EDITABLE = [
  'linkedDealership',
  'dealerName',
  'dealerCity',
  'dealerState',
  'dealerAddress',
  'dealerWebsite',
  'dealerMainPhone',
  'contacts',
  'stillInterested',
  'archivedAsStagnant',
  'hasPostedJob',
  'applicationSubmitted',
  'applicationSubmittedAt',
  'benefits',
  'nextStepType',
  'nextStepNotes',
  'notes',
];

// Map between DealerApplication's denormalized dealer-info field names and
// the corresponding fields on the shared Dealership record.
const DEALER_FIELD_MAP = {
  dealerName: 'name',
  dealerCity: 'city',
  dealerState: 'state',
  dealerAddress: 'address',
  dealerWebsite: 'website',
  dealerMainPhone: 'mainPhone',
};

router.put('/applications/:id', authenticateToken, async (req, res) => {
  try {
    const app = await loadOwnedApplication(req, res);
    if (!app) return;
    APPLICATION_EDITABLE.forEach((k) => {
      if (req.body[k] !== undefined) app[k] = req.body[k];
    });
    // Auto-manage applicationSubmittedAt whenever the toggle is touched.
    // We backfill on ANY save where applicationSubmitted is true but no
    // timestamp exists (catches legacy rows where the flag was set without
    // a date) and clear it whenever the toggle is set to No.
    if (req.body.applicationSubmitted !== undefined && req.body.applicationSubmittedAt === undefined) {
      if (app.applicationSubmitted && !app.applicationSubmittedAt) {
        app.applicationSubmittedAt = new Date();
      } else if (!app.applicationSubmitted) {
        app.applicationSubmittedAt = null;
      }
    }
    // Self-heal: if there's still no linkedDealership but a dealerName is set,
    // find or create a shared Dealership. Migrates legacy applications the
    // next time a student edits one.
    if (!app.linkedDealership && app.dealerName) {
      const dealer = await findOrCreateDealership({
        name: app.dealerName,
        city: app.dealerCity,
        state: app.dealerState,
        address: app.dealerAddress,
        website: app.dealerWebsite,
        mainPhone: app.dealerMainPhone,
        createdBy: req.user.id,
      });
      if (dealer) app.linkedDealership = dealer._id;
    }
    // Propagate dealer-info edits to the shared Dealership AND to every
    // other application's denormalized snapshot. Without the snapshot
    // propagation, students whose applications were created before the edit
    // would still see stale info on the panel form (which reads denormalized
    // fields when the populate path isn't followed).
    const dealerFieldsTouched = Object.keys(DEALER_FIELD_MAP).some((k) => req.body[k] !== undefined);
    if (dealerFieldsTouched && app.linkedDealership) {
      const dealer = await Dealership.findById(app.linkedDealership);
      if (dealer) {
        Object.entries(DEALER_FIELD_MAP).forEach(([appKey, dealerKey]) => {
          if (req.body[appKey] !== undefined) dealer[dealerKey] = req.body[appKey];
        });
        dealer.updatedBy = req.user.id;
        await dealer.save();

        // Mirror the same touched fields onto every DealerApplication linked
        // to this dealer so their snapshots stay in sync. Skip the current
        // app — it will be saved below by `app.save()`.
        const snapshotUpdate = {};
        Object.keys(DEALER_FIELD_MAP).forEach((appKey) => {
          if (req.body[appKey] !== undefined) snapshotUpdate[appKey] = req.body[appKey];
        });
        if (Object.keys(snapshotUpdate).length) {
          await DealerApplication.updateMany(
            { linkedDealership: dealer._id, _id: { $ne: app._id } },
            { $set: snapshotUpdate }
          );
        }
      }
    }
    await app.save();
    const populated = await DealerApplication.findById(app._id).populate('linkedDealership').lean();
    res.json(shapeApplication(populated, req.user));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/job-search/applications/:id/archive   { archived: true|false }
router.put('/applications/:id/archive', authenticateToken, async (req, res) => {
  try {
    const app = await loadOwnedApplication(req, res);
    if (!app) return;
    app.archivedAsStagnant = !!req.body.archived;
    await app.save();
    res.json(shapeApplication(app.toObject(), req.user));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/job-search/applications/:id
router.delete('/applications/:id', authenticateToken, async (req, res) => {
  try {
    const app = await loadOwnedApplication(req, res);
    if (!app) return;
    await Communication.deleteMany({ application: app._id });
    await DealerApplication.deleteOne({ _id: app._id });
    res.json({ message: 'Application deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/job-search/applications/reorder    { orderedIds: [id1, id2, ...], student? }
// Body may include { student } (staff only) to reorder another student's list.
router.post('/applications/reorder', authenticateToken, async (req, res) => {
  try {
    const ids = Array.isArray(req.body.orderedIds) ? req.body.orderedIds : null;
    if (!ids) return res.status(400).json({ message: 'orderedIds array required' });

    let studentId = req.user.id;
    if (req.body.student && String(req.body.student) !== String(req.user.id)) {
      if (!isStaff(req.user)) return res.status(403).json({ message: 'Not allowed' });
      studentId = req.body.student;
    }

    const apps = await DealerApplication.find({ _id: { $in: ids }, student: studentId });
    if (apps.length !== ids.length) {
      return res.status(403).json({ message: 'Cannot reorder applications that do not belong to that student' });
    }
    await Promise.all(
      ids.map((id, idx) =>
        DealerApplication.updateOne({ _id: id, student: studentId }, { $set: { sortIndex: idx } })
      )
    );
    const refreshed = await DealerApplication.find({ student: studentId })
      .sort({ sortIndex: 1, createdAt: 1 })
      .lean();
    res.json(refreshed.map((a) => shapeApplication(a, req.user)));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// -------- Communications ---------------------------------------------------

// GET /api/job-search/applications/:id/communications
router.get('/applications/:id/communications', authenticateToken, async (req, res) => {
  try {
    const app = await DealerApplication.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ message: 'Application not found' });
    const comms = await Communication.find({ application: app._id })
      .sort({ occurredAt: -1, createdAt: -1 })
      .lean();
    res.json(comms.map((c) => redactCommunication(req.user, c)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/job-search/applications/:id/communications
router.post('/applications/:id/communications', authenticateToken, async (req, res) => {
  try {
    const app = await loadOwnedApplication(req, res);
    if (!app) return;
    const { type, occurredAt, contactId, contactNameSnapshot, summary, offerAmount, attachmentKeys } = req.body;
    if (!type || !Communication.COMMUNICATION_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Invalid communication type' });
    }
    const comm = await Communication.create({
      application: app._id,
      student: app.student,
      type,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      contactId: contactId || null,
      contactNameSnapshot,
      summary,
      offerAmount: type === 'offer_received' ? offerAmount ?? null : null,
      attachmentKeys: Array.isArray(attachmentKeys) ? attachmentKeys : [],
    });

    // Roll up: app.lastEvent fields always reflect the most-recent communication.
    app.lastEventType = comm.type;
    app.lastEventAt = comm.occurredAt;
    // Auto-flip the highlighted "cover letter / resume sent" toggle on the
    // first send-type communication, so the dealer panel and the per-card
    // status pill stay in sync with the timeline. Both 'cover_letter_sent'
    // and 'application_submitted' represent the same milestone for the
    // purpose of the follow-up nudge clock.
    const isSendMilestone = comm.type === 'application_submitted' || comm.type === 'cover_letter_sent';
    if (isSendMilestone && !app.applicationSubmitted) {
      app.applicationSubmitted = true;
      app.applicationSubmittedAt = comm.occurredAt;
    }
    await app.save();

    res.status(201).json(redactCommunication(req.user, comm.toObject()));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/job-search/communications/:commId
router.put('/communications/:commId', authenticateToken, async (req, res) => {
  try {
    const comm = await Communication.findById(req.params.commId);
    if (!comm) return res.status(404).json({ message: 'Communication not found' });
    const isOwner = String(comm.student) === String(req.user.id);
    if (!isOwner && !isStaff(req.user)) return res.status(403).json({ message: 'Not allowed' });
    ['type', 'occurredAt', 'contactId', 'contactNameSnapshot', 'summary'].forEach((k) => {
      if (req.body[k] !== undefined) comm[k] = req.body[k];
    });
    if (req.body.offerAmount !== undefined && comm.type === 'offer_received') {
      comm.offerAmount = req.body.offerAmount;
    }
    await comm.save();

    // Re-roll the parent application's lastEvent fields (in case the edited comm
    // is no longer the latest).
    await rollupAppLastEvent(comm.application);

    res.json(redactCommunication(req.user, comm.toObject()));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/job-search/communications/:commId
router.delete('/communications/:commId', authenticateToken, async (req, res) => {
  try {
    const comm = await Communication.findById(req.params.commId);
    if (!comm) return res.status(404).json({ message: 'Communication not found' });
    const isOwner = String(comm.student) === String(req.user.id);
    if (!isOwner && !isStaff(req.user)) return res.status(403).json({ message: 'Not allowed' });
    const appId = comm.application;
    await Communication.deleteOne({ _id: comm._id });
    await rollupAppLastEvent(appId);
    res.json({ message: 'Communication deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function rollupAppLastEvent(applicationId) {
  const latest = await Communication.findOne({ application: applicationId })
    .sort({ occurredAt: -1, createdAt: -1 });
  const app = await DealerApplication.findById(applicationId);
  if (!app) return;
  if (latest) {
    app.lastEventType = latest.type;
    app.lastEventAt = latest.occurredAt;
  } else {
    app.lastEventType = 'none';
    app.lastEventAt = null;
  }
  await app.save();
}

// -------- Class summary board ---------------------------------------------

// GET /api/job-search/board?cohort=<id>
router.get('/board', authenticateToken, async (req, res) => {
  try {
    const userQuery = { role: 'student' };
    if (req.query.cohort) userQuery.cohort = req.query.cohort;
    const students = await User.find(userQuery)
      .select('_id firstName lastName username cohort isActive')
      .populate('cohort', 'name isActive')
      .lean();

    const ids = students.map((s) => s._id);
    const apps = await DealerApplication.find({ student: { $in: ids } }).lean();
    const comms = await Communication.find({ student: { $in: ids } })
      .sort({ occurredAt: -1 })
      .lean();

    const byStudent = new Map();
    students.forEach((s) =>
      byStudent.set(String(s._id), {
        studentId: s._id,
        studentName: [s.lastName, s.firstName].filter(Boolean).join(', ') || s.username,
        cohort: s.cohort ? s.cohort.name : null,
        cohortId: s.cohort ? s.cohort._id : null,
        cohortActive: s.cohort ? s.cohort.isActive !== false : true,
        studentActive: s.isActive !== false,
        // Legacy fields kept so existing consumers / tests don't break.
        activeCount: 0,
        stagnantCount: 0,
        parkedCount: 0,
        // Counts the instructor cares about
        dealerCount: 0,            // total non-parked dealers on the list
        dealersWithContact: 0,     // dealers with at least one name + email
        coverLetterSentCount: 0,   // dealers where applicationSubmitted=true
        pastSendingCount: 0,       // dealers progressed past send (follow-up event after send)
        // Red flag: at least one cover letter has aged past 6 days but the
        // student hasn't progressed past send on ANY dealer.
        zeroPastSendingPast6Days: false,
        hasOffer: false,           // has at least one offer_received
        // Aggregate worst-case follow-up nudge across this student's apps.
        // 'demand' (yellow) trumps 'encourage' (green); 'wait' is suppressed
        // on the board since it doesn't represent an outstanding task.
        followUpUrgency: null,
        // Pay (instructor / self only)
        latestOfferAmount: null,
        highestStartingWage: null,
      })
    );

    const URGENCY_RANK = { demand: 2, encourage: 1, wait: 0 };
    const now = new Date();
    apps.forEach((rawApp) => {
      const a = selfHealCoverLetterSent(rawApp);
      const entry = byStudent.get(String(a.student));
      if (!entry) return;

      // Legacy counts (active/stagnant/parked) — kept for backward compat.
      const stag = computeStagnation(a);
      if (a.archivedAsStagnant) {
        entry.parkedCount += 1;
        return; // parked rows don't roll into the new instructor metrics
      }
      if (a.stillInterested !== false) entry.activeCount += 1;
      if (stag.isStagnant) entry.stagnantCount += 1;

      entry.dealerCount += 1;

      // Has at least one contact with both a name (first or last) and an email?
      const hasIdContact = (a.contacts || []).some((c) => {
        const hasName = (c.firstName && c.firstName.trim()) || (c.lastName && c.lastName.trim());
        const hasEmail = c.email && c.email.trim();
        return hasName && hasEmail;
      });
      if (hasIdContact) entry.dealersWithContact += 1;

      if (a.applicationSubmitted) entry.coverLetterSentCount += 1;

      // "Engaged" = the dealer has actually participated. Counts only
      // unambiguous dealer-side events (email reply, virtual meeting,
      // in-person visit, interview, offer, rejection) — a phone call,
      // student-sent email, text, or "other" event alone could be a
      // voicemail / unanswered message / informational inquiry and does
      // not prove the dealer is engaged.
      if (a.lastEventType && ENGAGEMENT_TYPES.has(a.lastEventType)) {
        entry.pastSendingCount += 1;
      }

      // Worst-case board urgency for this student. We deliberately ignore
      // 'wait' here — the board is the instructor's nudge list, and
      // 0–6-day-old sends aren't yet outstanding.
      const u = followUpUrgency(a, now);
      if (u && u !== 'wait') {
        if (URGENCY_RANK[u] > URGENCY_RANK[entry.followUpUrgency || 'wait']) {
          entry.followUpUrgency = u;
        }
      }

      const wage = a.benefits && a.benefits.startingWage;
      if (wage != null && (entry.highestStartingWage == null || wage > entry.highestStartingWage)) {
        entry.highestStartingWage = wage;
      }
    });

    // Second pass for the "zero past-sending past 6 days" red flag.
    // Set if the student has at least one cover letter > 6 days old yet
    // they have not progressed past sending on any dealer.
    byStudent.forEach((entry) => {
      if (entry.pastSendingCount > 0) return;
      // any application past 6 days since send?
      const studentApps = apps
        .filter((a) => String(a.student) === String(entry.studentId) && !a.archivedAsStagnant)
        .map(selfHealCoverLetterSent);
      const sixDaysAgo = now.getTime() - 6 * 24 * 60 * 60 * 1000;
      const hasAgedSend = studentApps.some(
        (a) => a.applicationSubmitted && a.applicationSubmittedAt && new Date(a.applicationSubmittedAt).getTime() < sixDaysAgo
      );
      if (hasAgedSend) entry.zeroPastSendingPast6Days = true;
    });

    comms.forEach((c) => {
      const entry = byStudent.get(String(c.student));
      if (!entry) return;
      if (c.type === 'offer_received') {
        entry.hasOffer = true;
        if (c.offerAmount != null && entry.latestOfferAmount == null) {
          entry.latestOfferAmount = c.offerAmount;
        }
      }
    });

    const board = Array.from(byStudent.values())
      .map((entry) => redactBoardEntry(req.user, entry))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
    res.json(board);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------- PDF activity timeline export ------------------------------------

router.get('/applications/:id/timeline.pdf', authenticateToken, async (req, res) => {
  try {
    const app = await DealerApplication.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ message: 'Application not found' });
    const isOwner = String(app.student) === String(req.user.id);
    const allowed = isOwner || isStaff(req.user);
    if (!allowed) return res.status(403).json({ message: 'Not allowed' });
    const student = await User.findById(app.student).select('firstName lastName username').lean();
    const comms = await Communication.find({ application: app._id })
      .sort({ occurredAt: 1, createdAt: 1 })
      .lean();

    const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=timeline_${app._id}.pdf`);
    doc.pipe(res);

    doc.font('Helvetica-Bold').fontSize(18).text(`Job Search Timeline`, { align: 'center' });
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(12).text(
      `${student ? [student.firstName, student.lastName].filter(Boolean).join(' ') || student.username : 'Student'} — ${app.dealerName}`,
      { align: 'center' }
    );
    doc.moveDown(1);

    doc.font('Helvetica-Bold').fontSize(11).text('Application overview');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Dealership: ${app.dealerName}${app.dealerCity ? `, ${app.dealerCity}` : ''}${app.dealerState ? `, ${app.dealerState}` : ''}`);
    if (app.dealerWebsite) doc.text(`Website: ${app.dealerWebsite}`);
    if (app.dealerMainPhone) doc.text(`Phone: ${app.dealerMainPhone}`);
    doc.text(`Application submitted: ${app.applicationSubmitted ? 'Yes' : 'No'}`);
    doc.text(`Still interested: ${app.stillInterested !== false ? 'Yes' : 'No'}`);
    doc.text(`Parked (archived as stagnant): ${app.archivedAsStagnant ? 'Yes' : 'No'}`);
    doc.moveDown(0.7);

    doc.font('Helvetica-Bold').fontSize(11).text('Communications');
    doc.moveDown(0.3);
    if (!comms.length) {
      doc.font('Helvetica-Oblique').fontSize(10).text('No communications logged.');
    } else {
      doc.font('Helvetica').fontSize(10);
      comms.forEach((c) => {
        const when = c.occurredAt ? new Date(c.occurredAt).toLocaleString() : '—';
        const head = `${when}  —  ${c.type.replace(/_/g, ' ')}`;
        doc.font('Helvetica-Bold').text(head);
        doc.font('Helvetica');
        if (c.contactNameSnapshot) doc.text(`Contact: ${c.contactNameSnapshot}`);
        if (c.summary) doc.text(c.summary);
        if (c.type === 'offer_received' && c.offerAmount != null && (isOwner || isStaff(req.user))) {
          doc.text(`Offer amount: $${Number(c.offerAmount).toLocaleString()}`);
        }
        doc.moveDown(0.5);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------- Staff/admin: cascade delete a student's job-search data ---------
// Called by the existing user-delete handler (see routes/users.js). Exported
// for re-use rather than re-implementing there.
router.deleteStudentData = async function deleteStudentData(studentId) {
  await Communication.deleteMany({ student: studentId });
  await DealerApplication.deleteMany({ student: studentId });
  await JobSearch.deleteMany({ student: studentId });
};

module.exports = router;
