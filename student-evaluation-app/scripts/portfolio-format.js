/**
 * Format raw screenshots for the portfolio.
 *
 * - Reads PNGs from screenshots/_raw_group-evals/
 * - Normalizes to 1440 width (existing portfolio convention).
 * - For tall full-page captures, caps height at 1800 (no cropping needed; we keep
 *   them tall so the entire feature is visible, but we trim wasted whitespace
 *   below the last visible content if any).
 * - Writes optimized PNGs into screenshots/ with the prefix `groupevals-`.
 * - Generates a 2x2 hero collage for the project card.
 */

const path = require('path');
const fs = require('fs');

const SERVER_DIR = path.join(__dirname, '..', 'server');
const sharp = require(path.join(SERVER_DIR, 'node_modules', 'sharp'));

const SCREENSHOTS = 'C:\\Users\\zotte\\OneDrive\\Documents\\GitHub\\Git-Portfolio\\assets\\images\\screenshots';
const RAW = path.join(SCREENSHOTS, '_raw_group-evals');

const TARGET_W = 1440;
const MAX_H = 1800;

const ITEMS = [
  { in: '01-login.png',                  out: 'groupevals-01-login.png' },
  { in: '02-instructor-home.png',        out: 'groupevals-02-instructor-home.png' },
  { in: '03-manage-users.png',           out: 'groupevals-03-manage-users.png' },
  { in: '04-manage-cohorts.png',         out: 'groupevals-04-manage-cohorts.png' },
  { in: '05-manage-courses.png',         out: 'groupevals-05-manage-courses.png' },
  { in: '06-manage-quizzes.png',         out: 'groupevals-06-manage-quizzes.png' },
  { in: '07-quiz-gradebook.png',         out: 'groupevals-07-quiz-gradebook.png' },
  { in: '08-define-areas.png',           out: 'groupevals-08-evaluation-rubric.png' },
  { in: '09-tools.png',                  out: 'groupevals-09-tools-inventory.png' },
  { in: '10-consumables.png',            out: 'groupevals-10-consumables.png' },
  { in: '11-spare-parts.png',            out: 'groupevals-11-spare-parts.png' },
  { in: '12-training-vehicles.png',      out: 'groupevals-12-training-vehicles.png' },
  { in: '13-facility-needs.png',         out: 'groupevals-13-facility-needs.png' },
  { in: '14-inventory-reports.png',      out: 'groupevals-14-inventory-reports.png' },
  { in: '15-resume-builder.png',         out: 'groupevals-15-resume-builder.png' },
  { in: '16-student-home.png',           out: 'groupevals-16-student-home.png' },
  { in: '17-take-quiz.png',              out: 'groupevals-17-take-quiz.png' },
  { in: '18-student-quiz-gradebook.png', out: 'groupevals-18-student-quiz-gradebook.png' },
];

async function normalizeOne(inFile, outFile) {
  const src = path.join(RAW, inFile);
  const dst = path.join(SCREENSHOTS, outFile);
  let img = sharp(src);
  const meta = await img.metadata();

  // Resize to target width (preserve aspect)
  if (meta.width !== TARGET_W) {
    img = img.resize({ width: TARGET_W, withoutEnlargement: false });
  }

  // If a crop after resize is needed (height > MAX_H), crop from the top.
  const buf = await img.png({ compressionLevel: 9, palette: false }).toBuffer({ resolveWithObject: true });
  const finalH = buf.info.height;
  if (finalH > MAX_H) {
    await sharp(buf.data).extract({ left: 0, top: 0, width: TARGET_W, height: MAX_H }).png({ compressionLevel: 9 }).toFile(dst);
  } else {
    await sharp(buf.data).png({ compressionLevel: 9 }).toFile(dst);
  }
  const out = await sharp(dst).metadata();
  console.log(`[fmt] ${outFile.padEnd(46)} ${out.width}x${out.height}`);
}

async function makeHero() {
  // 2x2 collage from four representative shots.
  const tiles = [
    '02-instructor-home.png',
    '07-quiz-gradebook.png',
    '09-tools.png',
    '17-take-quiz.png',
  ];
  const tileW = 1100; // tile native width before margin
  const tileH = 720;
  const padding = 40;
  const heroW = tileW * 2 + padding * 3;
  const heroH = tileH * 2 + padding * 3;

  const composites = [];
  for (let i = 0; i < tiles.length; i++) {
    const src = path.join(RAW, tiles[i]);
    // Crop top portion to fit aspect (showing the most informative top of each page).
    const cropped = await sharp(src).extract({ left: 0, top: 0, width: 1440, height: Math.min((await sharp(src).metadata()).height, 1100) }).resize(tileW, tileH, { fit: 'cover', position: 'top' }).png().toBuffer();
    const col = i % 2;
    const row = Math.floor(i / 2);
    composites.push({
      input: cropped,
      left: padding + col * (tileW + padding),
      top: padding + row * (tileH + padding),
    });
  }

  const dst = path.join(SCREENSHOTS, 'groupevals-hero.png');
  await sharp({
    create: { width: heroW, height: heroH, channels: 3, background: { r: 14, g: 18, b: 28 } },
  }).composite(composites).png({ compressionLevel: 9 }).toFile(dst);

  // Also create a 1440-wide version for portfolio cards.
  const dst1440 = path.join(SCREENSHOTS, 'groupevals-hero-1440.png');
  await sharp(dst).resize({ width: 1440 }).png({ compressionLevel: 9 }).toFile(dst1440);
  const m = await sharp(dst1440).metadata();
  console.log(`[hero] groupevals-hero-1440.png ${m.width}x${m.height}`);
}

(async () => {
  for (const it of ITEMS) {
    try { await normalizeOne(it.in, it.out); } catch (e) { console.error('[err]', it.in, e.message); }
  }
  await makeHero();
  console.log('[done] formatting complete');
})();
