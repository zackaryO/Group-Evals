// scripts/set-graduation-dates.js
//
// Sets every student's JobSearch.graduationDate to a fixed date.
// Idempotent: re-running just rewrites the same value. Logs everything to
// scripts/grad-dates-output.log so you don't depend on the console window.
//
// Usage (from student-evaluation-app/server):
//   node scripts/set-graduation-dates.js --dry-run    # preview
//   node scripts/set-graduation-dates.js              # write

const path = require('path');
const fs = require('fs');

const LOG_PATH = path.join(__dirname, 'grad-dates-output.log');
let _logStream;
try { _logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' }); } catch (e) {}
function log(msg) {
  const line = typeof msg === 'string' ? msg : JSON.stringify(msg);
  try { process.stdout.write(line + '\n'); } catch (_) {}
  if (_logStream) _logStream.write(line + '\n');
}

log(`set-graduation-dates: starting (pid ${process.pid}, node ${process.version})`);
log(`log file at ${LOG_PATH}`);

// Hunt for .env in the obvious places.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
];
let envLoaded = null;
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    require('dotenv').config({ path: p });
    envLoaded = p;
    break;
  }
}
log(envLoaded ? `loaded env from ${envLoaded}` : 'NO .env found');
log(`MONGODB_URI is ${process.env.MONGODB_URI ? 'present' : 'MISSING'}`);

const mongoose = require('mongoose');
const User = require('../models/User');
const JobSearch = require('../models/JobSearch');

const DRY_RUN = process.argv.includes('--dry-run');
const TARGET_DATE = new Date('2026-06-26T00:00:00.000Z'); // June 26, 2026

log(`DRY_RUN=${DRY_RUN}`);
log(`Target graduation date: ${TARGET_DATE.toISOString()}`);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    log('ERROR: MONGODB_URI not set');
    process.exitCode = 1;
    return;
  }
  log(`Connecting to MongoDB${DRY_RUN ? ' (DRY RUN)' : ''}...`);
  await mongoose.connect(uri);
  const dbName = mongoose.connection.name || mongoose.connection.db?.databaseName || '(unknown)';
  log(`Connected to database: ${dbName}`);
  log('----------------------------------------------');

  const students = await User.find({ role: 'student' }).select('_id firstName lastName username').lean();
  log(`Found ${students.length} student user(s).`);

  let updated = 0;
  let unchanged = 0;
  let created = 0;

  for (const s of students) {
    const label = `${[s.firstName, s.lastName].filter(Boolean).join(' ') || s.username} (${s._id})`;
    let js = await JobSearch.findOne({ student: s._id });

    if (!js) {
      if (DRY_RUN) {
        log(`  + ${label}: would CREATE JobSearch with graduationDate set`);
        created += 1;
        continue;
      }
      js = await JobSearch.create({ student: s._id, graduationDate: TARGET_DATE });
      log(`  + ${label}: created JobSearch with graduationDate ${TARGET_DATE.toISOString().slice(0, 10)}`);
      created += 1;
      continue;
    }

    const currentISO = js.graduationDate ? new Date(js.graduationDate).toISOString() : null;
    if (currentISO === TARGET_DATE.toISOString()) {
      log(`  · ${label}: already set to ${currentISO.slice(0, 10)}, no change`);
      unchanged += 1;
      continue;
    }

    if (DRY_RUN) {
      log(`  ~ ${label}: would UPDATE ${currentISO ? currentISO.slice(0, 10) : '(none)'} -> ${TARGET_DATE.toISOString().slice(0, 10)}`);
    } else {
      js.graduationDate = TARGET_DATE;
      await js.save();
      log(`  ~ ${label}: updated ${currentISO ? currentISO.slice(0, 10) : '(none)'} -> ${TARGET_DATE.toISOString().slice(0, 10)}`);
    }
    updated += 1;
  }

  log('----------------------------------------------');
  log(`${DRY_RUN ? 'DRY RUN COMPLETE' : 'COMPLETE'}: ${created} created, ${updated} updated, ${unchanged} unchanged.`);
  await mongoose.disconnect();
}

main()
  .catch((err) => {
    log(`Script failed: ${err && err.stack ? err.stack : err}`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (_logStream) _logStream.end();
  });
