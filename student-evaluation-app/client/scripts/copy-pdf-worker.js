/* Keeps public/pdf.worker.min.js in sync with the installed pdfjs-dist version.
   Runs automatically after `npm install` via the "postinstall" hook. */

const fs = require('fs');
const path = require('path');

const SRC = path.join(
  __dirname,
  '..',
  'node_modules',
  'pdfjs-dist',
  'legacy',
  'build',
  'pdf.worker.min.js'
);
const DEST = path.join(__dirname, '..', 'public', 'pdf.worker.min.js');

try {
  if (!fs.existsSync(SRC)) {
    // pdfjs-dist isn't installed yet (e.g. during initial npm install ordering).
    // Skip silently — the script will run again at the end of install.
    process.exit(0);
  }
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.copyFileSync(SRC, DEST);
  // eslint-disable-next-line no-console
  console.log(`[copy-pdf-worker] Copied ${path.basename(SRC)} -> public/`);
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn(`[copy-pdf-worker] Skipped: ${err.message}`);
  process.exit(0); // never fail install over this
}
