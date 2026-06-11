// One-off: mark "A6 ASE practice 1" as shared with electrical instructors so
// electrical instructors can edit/assign it (the documented exception). Safe to
// re-run. Usage:  node scripts/flag-a6-shared.js
require('dotenv').config();
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');

const TARGET_TITLE = 'A6 ASE practice 1';

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI in environment.');
    process.exit(1);
  }
  await mongoose.connect(uri);

  // Case-insensitive exact match so trailing/case differences still resolve.
  const rx = new RegExp(`^\\s*${TARGET_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  const matches = await Quiz.find({ title: rx }).select('title sharedWithElectrical');

  if (matches.length === 0) {
    console.log(`No quiz titled "${TARGET_TITLE}" found. Existing A6-ish titles:`);
    const a6 = await Quiz.find({ title: /a6/i }).select('title');
    a6.forEach((q) => console.log(`  - "${q.title}"`));
  } else {
    for (const q of matches) {
      q.sharedWithElectrical = true;
      await q.save();
      console.log(`Flagged shared: "${q.title}" (${q._id})`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
