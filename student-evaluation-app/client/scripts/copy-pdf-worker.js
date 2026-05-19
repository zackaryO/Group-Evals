/* Keeps public/pdf.worker.min.* in sync with the installed pdfjs-dist version.
   Runs automatically after `npm install` via the "postinstall" hook.

   pdfjs-dist v3.x ships pdf.worker.min.js (UMD).
   pdfjs-dist v4.x ships pdf.worker.min.mjs (ESM). We copy whichever exists
   so the worker file is always present alongside the loader expectations. */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(
  __dirname,
  '..',
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build'
);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Order matters: prefer the modern (.mjs) variant when both exist.
const CANDIDATES = ['pdf.worker.min.mjs', 'pdf.worker.min.js'];

try {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  let copied = 0;
  for (const name of CANDIDATES) {
    const src = path.join(BUILD_DIR, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(PUBLIC_DIR, name));
      // eslint-disable-next-line no-console
      console.log(`[copy-pdf-worker] Copied ${name} -> public/`);
      copied++;
    }
  }

  if (copied === 0) {
    // pdfjs-dist isn't installed yet (e.g. during initial npm install ordering).
    // Skip silently — the script will run again at the end of install.
    process.exit(0);
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn(`[copy-pdf-worker] Skipped: ${err.message}`);
  process.exit(0); // never fail install over this
}
