// scripts/seed-dealer-data.js
//
// Idempotent seed for the current cohort's dealer applications + contacts.
// Re-running is safe: dealerships, applications, and contacts are all
// find-or-create on (case-insensitive name / first+last). Nothing is deleted
// or overwritten — only missing rows are added.
//
// Usage (from student-evaluation-app/server):
//   node scripts/seed-dealer-data.js --dry-run    # preview, no writes
//   node scripts/seed-dealer-data.js              # actually write
//
// Notes:
//   - Student lookup is by case-insensitive firstName regex. If a student in
//     the DB has a different spelling than below, the script will warn and
//     skip them; adjust the `match` field to fix.
//   - Dealer names are canonicalized to "Mercedes-Benz of <City>" (hyphen, lc
//     "of") even though the source list mixed styles, so dedup across students
//     works reliably. Edit a `name` in PLANS if a dealer should be different.
//   - Mitchell's source list has Long Beach twice (Colby Shaffer / Schaffer).
//     We keep one application (Long Beach) with one contact (Colby Shaffer,
//     matching the spelling used by Jhony's list).
//   - Every dealer in the source list represents a dealership the student has
//     already sent a cover letter + resume to, so the script logs a
//     `cover_letter_sent` Communication on each application (occurredAt = now,
//     because we don't have actual send dates). Idempotent: a second run
//     won't duplicate the communication. Edit dates via the UI if needed.

// Tee everything to a log file in this script's directory. The user can read
// `scripts/seed-output.log` afterwards without depending on PowerShell to
// preserve the console window. PS sometimes opens a transient window for node
// that closes before any output is read; the log file makes that irrelevant.
const path = require('path');
const fs = require('fs');

const LOG_PATH = path.join(__dirname, 'seed-output.log');
let _logStream;
try {
  _logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });
} catch (e) {
  // Couldn't open log file — fall through and rely on stdout only.
}
function log(msg) {
  const line = typeof msg === 'string' ? msg : JSON.stringify(msg);
  try { process.stdout.write(line + '\n'); } catch (_) {}
  if (_logStream) _logStream.write(line + '\n');
}
function logError(label, err) {
  const text = err && err.stack ? err.stack : String(err);
  log(`${label}: ${text}`);
}

log(`seed-dealer-data: script starting (pid ${process.pid}, node ${process.version})`);
log(`seed-dealer-data: log file at ${LOG_PATH}`);

// Hunt for .env in the obvious places. Different setups put it in either
// server/ or the repo root.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '.env'),
];
let envLoaded = null;
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    envLoaded = p;
    break;
  }
}
log(envLoaded ? `seed-dealer-data: loaded env from ${envLoaded}` : 'seed-dealer-data: NO .env found in expected paths');
log(`seed-dealer-data: MONGODB_URI is ${process.env.MONGODB_URI ? 'present' : 'MISSING'}`);

const mongoose = require('mongoose');

const User = require('../models/User');
const Dealership = require('../models/Dealership');
const JobSearch = require('../models/JobSearch');
const DealerApplication = require('../models/DealerApplication');
const Communication = require('../models/Communication');

const DRY_RUN = process.argv.includes('--dry-run');
log(`seed-dealer-data: DRY_RUN=${DRY_RUN}`);

// ─────────────────────────────────────────────────────────────────────────
// Name canonicalization.
//
// Pre-existing data (from before the shared-directory feature) may have
// dealer names that are spelling variants of the canonical names used in
// PLANS below — e.g. "Mercedes-Benz Of Salt Lake" written by hand into a
// student's application before SLC was a master Dealership. The migration
// pass below treats LHS as an alias for RHS so the legacy app gets linked
// to the same shared Dealership the seed plans want, instead of creating
// a parallel record. Add entries as needed.
// Keys are lower-cased exact matches against the legacy `dealerName` text.
const NAME_RENAMES = new Map([
  ['mercedes-benz of salt lake', 'Mercedes-Benz of Salt Lake City'],
]);

function canonicalize(name) {
  const trimmed = (name || '').trim();
  return NAME_RENAMES.get(trimmed.toLowerCase()) || trimmed;
}

// ─────────────────────────────────────────────────────────────────────────
// Per-student plans. Edit these in place if names differ in your DB.
// ─────────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    label: 'Mitchell E',
    match: { firstName: /^mitchell$/i },
    dealers: [
      { name: 'Mercedes-Benz of South Bay',   contacts: [['Robert', 'Garcia']] },
      { name: 'Mercedes-Benz of Long Beach',  contacts: [['Colby', 'Shaffer']] },
      { name: 'Mercedes-Benz of West Covina', contacts: [['Rian', 'Liu']] },
      { name: 'Mercedes-Benz of Monterey',    contacts: [['Yudith', 'Albarron']] },
    ],
  },
  {
    label: 'Andy F',
    match: { firstName: /^andy$/i },
    dealers: [
      { name: 'Mercedes-Benz of Carlsbad',       contacts: [['Dave', 'Cram']] },
      { name: 'Mercedes-Benz of St. Charles',    contacts: [['Ron', 'Neal']] },
      { name: 'Mercedes-Benz of Salt Lake City', contacts: [['Angela', 'Heaps']] },
      { name: 'Mercedes-Benz of El Cajon',       contacts: [['Ernie', 'Serrano']] },
      { name: 'Mercedes-Benz of Farmington',     contacts: [['Connor', 'Shulz']] },
      { name: 'Mercedes-Benz of San Diego',      contacts: [['Nick', 'Zellmann']] },
    ],
  },
  {
    label: 'Elliott L',
    match: { firstName: /^elliott?$/i },
    dealers: [
      { name: 'Mercedes-Benz of San Antonio', contacts: [['Javier', 'Perez'], ['Daniel', 'Lauer']] },
      { name: 'Mercedes-Benz of Selma',       contacts: [['Jonathan', 'Hess']] },
      { name: 'Mercedes-Benz of Sugar Land',  contacts: [['Brian', 'Ron'], ['Sean', 'Sullivan'], ['Steve', 'Stojack']] },
      { name: 'Mercedes-Benz of Farmington',  contacts: [['Connor', 'Shulz']] },
      { name: 'Mercedes-Benz of Buckhead',    contacts: [['Roger', 'Kaiser']] },
      { name: 'Mercedes-Benz of Boerne',      contacts: [['Kevin', 'Boles']] },
    ],
  },
  {
    label: 'Jhony R',
    match: { firstName: /^jhony$/i },
    dealers: [
      { name: 'Mercedes-Benz Van Center – Warner', contacts: [['Lance', 'Decker']] },
      { name: 'Mercedes-Benz of Long Beach',       contacts: [['Colby', 'Shaffer']] },
      { name: 'Mercedes-Benz of Salt Lake City',   contacts: [['Angela', 'Heaps']] },
      { name: 'Mercedes-Benz of Anchorage',        contacts: [['Brian', 'Curtice']] },
      { name: 'Mercedes-Benz of New Orleans',      contacts: [['Clay', 'Moret']] },
    ],
  },
  {
    label: 'Carlos L',
    match: { firstName: /^carlos$/i },
    dealers: [
      { name: 'Garaje Isla Verde', contacts: [['Lucas', 'Figueroa']] },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// In-memory dedup cache used during dry-run only. When dry-run encounters a
// would-be-created dealer, we remember it under its lowercase trimmed name
// so subsequent students looking up the same dealer see "existing" rather
// than another "new". This makes dry-run output accurately match what a real
// run would do.
const _dryDealerCache = new Map();

async function findOrCreateDealership(name, createdBy) {
  const trimmed = name.trim();
  const cacheKey = trimmed.toLowerCase();
  const filter = { name: new RegExp(`^${escapeRx(trimmed)}$`, 'i') };

  if (DRY_RUN && _dryDealerCache.has(cacheKey)) {
    return { dealer: _dryDealerCache.get(cacheKey), created: false };
  }

  const existing = await Dealership.findOne(filter);
  if (existing) {
    if (DRY_RUN) _dryDealerCache.set(cacheKey, existing);
    return { dealer: existing, created: false };
  }

  if (DRY_RUN) {
    const stub = { _id: '(dry)', name: trimmed };
    _dryDealerCache.set(cacheKey, stub);
    return { dealer: stub, created: true };
  }
  const dealer = await Dealership.create({
    name: trimmed,
    createdBy,
    updatedBy: createdBy,
  });
  return { dealer, created: true };
}

// Pre-seed migration: every DealerApplication with `linkedDealership: null`
// gets promoted into the master directory. Reads the application's
// denormalized dealerName/city/state and either links to an existing
// Dealership matching that name (case-insensitive, after canonicalization)
// or creates a new one carrying that data forward. Idempotent.
async function migrateOrphanedApplications() {
  const orphans = await DealerApplication.find({
    $or: [{ linkedDealership: null }, { linkedDealership: { $exists: false } }],
  });
  if (!orphans.length) {
    log('No orphaned applications to migrate.');
    log('');
    return;
  }
  log(`Migrating ${orphans.length} orphaned application(s) into master Dealership records...`);
  for (const app of orphans) {
    if (!app.dealerName) {
      log(`  - skipping app ${app._id} (no dealerName set)`);
      continue;
    }
    const original = app.dealerName;
    const canonical = canonicalize(original);
    const renamed = canonical !== original;

    const filter = { name: new RegExp(`^${escapeRx(canonical)}$`, 'i') };
    let dealer = await Dealership.findOne(filter);
    let createdNew = false;
    if (!dealer) {
      if (DRY_RUN) {
        // Stub for dry-run cache; subsequent plan lookups should see this.
        dealer = { _id: '(dry)', name: canonical };
        _dryDealerCache.set(canonical.toLowerCase(), dealer);
      } else {
        dealer = await Dealership.create({
          name: canonical,
          city: app.dealerCity,
          state: app.dealerState,
          address: app.dealerAddress,
          website: app.dealerWebsite,
          mainPhone: app.dealerMainPhone,
          createdBy: app.student,
          updatedBy: app.student,
        });
      }
      createdNew = true;
    } else if (DRY_RUN) {
      _dryDealerCache.set(canonical.toLowerCase(), dealer);
    }

    const renameNote = renamed ? ` (renamed from "${original}")` : '';
    log(
      `  - app ${app._id}: ${createdNew ? 'CREATED' : 'reused'} dealer "${dealer.name}"${renameNote}`
    );

    if (!DRY_RUN) {
      app.linkedDealership = dealer._id;
      if (renamed) {
        app.dealerName = canonical;
      }
      await app.save();
    }
  }
  log('');
}

// Pre-flight: list every dealership currently in the DB. Helps diagnose
// "I expected this to exist but the script created a new one" — usually
// the existing record has a slightly different name (different hyphenation,
// missing word, etc.) so the case-insensitive exact-match misses.
async function listExistingDealers() {
  const all = await Dealership.find({}, { name: 1, city: 1, state: 1 }).sort({ name: 1 }).lean();
  log('');
  log(`Existing dealers in DB: ${all.length}`);
  if (all.length === 0) {
    log('  (none)');
  } else {
    for (const d of all) {
      const loc = [d.city, d.state].filter(Boolean).join(', ');
      log(`  - "${d.name}"${loc ? ` (${loc})` : ''}`);
    }
  }
  log('');
}

async function getOrCreateJobSearch(studentId) {
  if (DRY_RUN) return { _id: '(dry)' };
  return JobSearch.findOneAndUpdate(
    { student: studentId },
    { $setOnInsert: { student: studentId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function findOrCreateApplication(student, jobSearch, dealer, sortIndex) {
  // Dry-run sentinel: when a Dealership would be newly created, dealer._id is
  // the string "(dry)" instead of a real ObjectId. We must skip queries that
  // try to cast that to an ObjectId.
  const dealerIsFake = dealer._id === '(dry)';

  // Prefer match by linkedDealership; fall back to denormalized dealerName so
  // existing pre-shared-directory records get reused (and linked).
  let app = null;
  if (!dealerIsFake) {
    app = await DealerApplication.findOne({
      student: student._id,
      linkedDealership: dealer._id,
    });
  }
  if (!app) {
    app = await DealerApplication.findOne({
      student: student._id,
      dealerName: new RegExp(`^${escapeRx(dealer.name)}$`, 'i'),
    });
  }
  if (app) {
    if (!app.linkedDealership && !dealerIsFake) {
      app.linkedDealership = dealer._id;
      if (!DRY_RUN) await app.save();
    }
    return { app, created: false };
  }
  if (DRY_RUN) {
    return { app: { _id: '(dry)', dealerName: dealer.name, contacts: [] }, created: true };
  }
  app = await DealerApplication.create({
    jobSearch: jobSearch._id,
    student: student._id,
    linkedDealership: dealer._id,
    dealerName: dealer.name,
    dealerCity: dealer.city,
    dealerState: dealer.state,
    sortIndex,
    contacts: [],
  });
  return { app, created: true };
}

// Logs a cover_letter_sent communication on the application if one isn't
// already present. After creating, rolls up the application's lastEventType
// and lastEventAt fields from whichever communication is now the most recent
// (so the dashboard's "last activity" stays accurate).
async function ensureCoverLetterSent(student, app) {
  if (DRY_RUN) {
    // Can't query against a dry "(dry)" id. Assume creation in dry-run for the log.
    return { created: true, alreadyExisted: false };
  }
  const existing = await Communication.findOne({
    application: app._id,
    type: 'cover_letter_sent',
  });
  if (existing) return { created: false, alreadyExisted: true };

  await Communication.create({
    application: app._id,
    student: student._id,
    type: 'cover_letter_sent',
    occurredAt: new Date(),
    summary: 'Cover letter and resume sent.',
  });

  // Roll up lastEventType / lastEventAt from the now-latest communication.
  const latest = await Communication.findOne({ application: app._id })
    .sort({ occurredAt: -1, createdAt: -1 });
  if (latest) {
    app.lastEventType = latest.type;
    app.lastEventAt = latest.occurredAt;
    await app.save();
  }
  return { created: true, alreadyExisted: false };
}

async function ensureContacts(app, contacts) {
  let added = 0;
  for (const [first, last] of contacts) {
    const exists = (app.contacts || []).some(
      (c) =>
        (c.firstName || '').toLowerCase() === first.toLowerCase() &&
        (c.lastName || '').toLowerCase() === last.toLowerCase()
    );
    if (!exists) {
      added += 1;
      if (!DRY_RUN) {
        app.contacts.push({
          firstName: first,
          lastName: last,
          role: 'other',
        });
      }
    }
  }
  if (added && !DRY_RUN) await app.save();
  return added;
}

async function processStudent(plan) {
  const student = await User.findOne({ ...plan.match, role: 'student' });
  if (!student) {
    log(`\n✗ ${plan.label}: no matching student found in DB — skipping`);
    return { skipped: true };
  }
  log(`\n→ ${plan.label}: matched ${student.firstName} ${student.lastName} (${student._id})`);
  const js = await getOrCreateJobSearch(student._id);

  // Dedup within the plan (Mitchell's source list has Long Beach twice).
  const seen = new Set();
  const uniqueDealers = [];
  for (const d of plan.dealers) {
    const key = d.name.toLowerCase().trim();
    if (seen.has(key)) {
      log(`   · ignoring duplicate within plan: ${d.name}`);
      continue;
    }
    seen.add(key);
    uniqueDealers.push(d);
  }

  let nextIdx = await DealerApplication.countDocuments({ student: student._id });
  for (const d of uniqueDealers) {
    const { dealer, created: dealerCreated } = await findOrCreateDealership(d.name, student._id);
    const { app, created: appCreated } = await findOrCreateApplication(student, js, dealer, nextIdx);
    if (appCreated) nextIdx += 1;
    const addedContacts = await ensureContacts(app, d.contacts);
    const cl = await ensureCoverLetterSent(student, app);
    const clNote = cl.alreadyExisted ? 'cover letter already logged' : 'cover letter logged';
    log(
      `   ✓ ${dealer.name}` +
        ` (${dealerCreated ? 'new dealer' : 'existing dealer'},` +
        ` ${appCreated ? 'new application' : 'existing application'},` +
        ` +${addedContacts} contact${addedContacts === 1 ? '' : 's'},` +
        ` ${clNote})`
    );
  }
  return { skipped: false };
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    log('ERROR: MONGODB_URI not set. Check that server/.env exists and contains MONGODB_URI=...');
    process.exitCode = 1;
    return;
  }
  log(`Connecting to MongoDB${DRY_RUN ? ' (DRY RUN -- no writes)' : ''}...`);
  await mongoose.connect(uri);
  // Surface which database we're actually connected to. Helps catch the
  // "URI points at a different cluster than the dev app" failure mode.
  const dbName = mongoose.connection.name || mongoose.connection.db?.databaseName || '(unknown)';
  log(`Connected to database: ${dbName}`);
  await listExistingDealers();
  // Promote any pre-shared-directory orphan applications into the master
  // Dealership collection so subsequent seed lookups can find them.
  await migrateOrphanedApplications();
  log('----------------------------------------------');

  let processed = 0;
  let skipped = 0;
  for (const plan of PLANS) {
    const result = await processStudent(plan);
    if (result.skipped) skipped += 1;
    else processed += 1;
  }

  log('----------------------------------------------');
  log(`${DRY_RUN ? 'DRY RUN COMPLETE' : 'SEED COMPLETE'} -- ${processed} student(s) processed, ${skipped} skipped.`);
  await mongoose.disconnect();
}

main()
  .catch((err) => {
    logError('Seed script failed', err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (_logStream) _logStream.end();
  });
