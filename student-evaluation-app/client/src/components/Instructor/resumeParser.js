/* Resume importer — round-trips our own PDFs via embedded JSON metadata,
   and heuristically parses third-party PDF / DOCX / TXT / JSON resumes
   into the same shape consumed by ResumeBuilder. */

export const EMBED_MARKER = 'MBDRIVEJC_RESUME_JSON_V1:';

/* ------------------------- shape + small helpers ------------------------- */

const emptyEducation = () => ({
  title: '', institution: '', startDate: '', endDate: '', location: '',
  details: [], hiddenDetails: [],
});
const emptyWork = () => ({
  title: '', company: '', startDate: '', endDate: '', location: '',
  details: [], hiddenDetails: [],
});

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
// Leading \(? so "(619) 746-2432" keeps its opening paren (it used to import
// as "619) 746-2432").
const PHONE_RE = /(\+?\(?\d[\d().\-\s]{8,}\d)/;
const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']+|(?:[\w-]+\.)+(?:com|org|net|io|dev|app|co|gov|edu)(?:\/[^\s<>"']*)?)/i;
const LINKEDIN_RE = /(linkedin\.com\/[\w\-./%]+|linkedin\.com\b)/i;

const norm = (s) => (s || '').replace(/[‐-―−]/g, '-').replace(/\s+/g, ' ').trim();

/* ----------------------- section header recognition ---------------------- */

const SECTION_PATTERNS = [
  { key: 'summary',         re: /^(professional\s+summary|summary|objective|profile)$/i },
  { key: 'certifications',  re: /^(certifications?|licenses?|certifications?\s*&\s*licenses?)$/i },
  { key: 'skills',          re: /^(skills|technical\s+skills|core\s+(competencies|skills))$/i },
  { key: 'education',       re: /^(education|academic\s+background)$/i },
  { key: 'work',            re: /^(work\s+experience|experience|employment|professional\s+experience)$/i },
  { key: 'tools',           re: /^(tools(\s*&\s*technolog(y|ies))?|technology|tools)$/i },
];

const matchSectionHeader = (lineRaw) => {
  const line = norm(lineRaw).replace(/[:•\-—]+\s*$/, '');
  if (!line || line.length > 60) return null;
  for (const { key, re } of SECTION_PATTERNS) {
    if (re.test(line)) return key;
  }
  return null;
};

/* ----------------------------- header / contact -------------------------- */

const stripBullet = (line) => line.replace(/^[\s•·●○*\-–—►▪]+/, '').trim();

// Unicode-aware: accented names (José, Muñoz, García...) used to fail the
// ASCII-only pattern and import with an empty name.
const NAME_RE = /^[\p{L}][\p{L}'.,\- ]{1,80}$/u;
const looksLikeName = (s) => {
  if (!NAME_RE.test(s)) return false;
  const words = s.split(/\s+/).length;
  return words >= 2 && words <= 6;
};

/* Remove contact tokens (email / phone / URLs / "Cell:" labels / separators)
   from a line so a name or title sharing the line with them can still be
   recognized — e.g. "John Smith | john@x.com | (555) 123-4567". */
const stripContactTokens = (s) =>
  norm(
    (s || '')
      .replace(new RegExp(EMAIL_RE.source, 'gi'), ' ')
      .replace(new RegExp(LINKEDIN_RE.source, 'gi'), ' ')
      .replace(new RegExp(URL_RE.source, 'gi'), ' ')
      .replace(new RegExp(PHONE_RE.source, 'g'), ' ')
      .replace(/\b(cell|phone|tel|mobile|fax|email|e-mail)\b\s*:?/gi, ' ')
      .replace(/[|•·]+/g, ' ')
  ).replace(/^[\s\-–—,;:]+|[\s\-–—,;:]+$/g, '');

const parseHeader = (lines) => {
  const out = { fullName: '', title: '', email: '', phone: '', linkedinUrl: '' };

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const l = norm(lines[i]);
    if (!l) continue;
    if (!out.email) {
      const m = l.match(EMAIL_RE);
      if (m) out.email = m[0];
    }
    if (!out.phone) {
      const m = l.match(PHONE_RE);
      if (m) {
        const digits = m[1].replace(/\D/g, '');
        if (digits.length >= 10) out.phone = m[1].trim();
      }
    }
    if (!out.linkedinUrl) {
      const m = l.match(LINKEDIN_RE);
      if (m) {
        let u = m[1];
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        out.linkedinUrl = u;
      }
    }
  }

  // Name = first line near the top that looks like a person's name, after
  // stripping any contact tokens that share the line with it.
  for (let i = 0; i < Math.min(lines.length, 6); i++) {
    const l = norm(lines[i]);
    if (!l) continue;
    if (matchSectionHeader(l)) break;
    const hasContact = EMAIL_RE.test(l) || PHONE_RE.test(l) || URL_RE.test(l);
    const candidate = hasContact ? stripContactTokens(l) : l;
    if (!candidate) continue;
    if (looksLikeName(candidate)) {
      out.fullName = candidate;
      // Title is often the next non-contact line
      for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
        const lj = norm(lines[j]);
        if (!lj) continue;
        if (matchSectionHeader(lj)) break;
        let t = lj;
        if (EMAIL_RE.test(t) || PHONE_RE.test(t) || URL_RE.test(t)) {
          t = stripContactTokens(t);
          if (!t) continue;
        }
        if (t.length > 80) break;
        out.title = t;
        break;
      }
      break;
    }
  }

  return out;
};

/* --------------------------- section splitting --------------------------- */

const splitSections = (lines) => {
  const sections = { header: [], summary: [], certifications: [], skills: [], education: [], work: [], tools: [] };
  let current = 'header';
  for (const raw of lines) {
    const lineKey = matchSectionHeader(raw);
    if (lineKey) {
      current = lineKey;
      continue;
    }
    sections[current].push(raw);
  }
  return sections;
};

/* ---------------------------- list-section parse ------------------------- */

const parseListSection = (rawLines) => {
  const out = [];
  for (const raw of rawLines) {
    const line = stripBullet(norm(raw));
    if (!line) continue;
    // Many resumes lay these out as 2-column tables that get flattened with "  " or tabs;
    // also split on " | " or "  " when the line looks like two items.
    const parts = line.split(/\s{2,}|\t+|\s+\|\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((p) => p.length < 80)) {
      parts.forEach((p) => out.push(p));
    } else {
      out.push(line);
    }
  }
  return out;
};

/* ----------------------- structured entries parse ----------------------- */

const DATE_RANGE_RE = /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{4}|present|current|expected[^,\n]*?\d{0,4})\b/gi;
const HAS_DATE_RE = /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s*\d{4}|\d{4}|present|current)\b/i;
const BULLET_RE = /^[\s•·●○*\-–—►▪]/;

/* Each entry occupies a block of consecutive non-empty lines starting with a heading-ish line.
   Heuristic: a block boundary occurs on:
   - blank line followed by non-bullet text
   - a non-bullet line that is short (< 90 chars), has no email/phone, and is not the same as the previous "details" pattern.
*/
const parseStructuredEntries = (rawLines, kind /* 'education' | 'work' */) => {
  const out = [];
  let entry = null;
  let details = [];
  let metaConsumed = 0;

  const newEntry = () => (kind === 'education' ? emptyEducation() : emptyWork());

  const flush = () => {
    if (!entry) return;
    entry.details = details;
    if (entry.title || entry.institution || entry.company || details.length) {
      out.push(entry);
    }
    entry = null;
    details = [];
    metaConsumed = 0;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const trimmed = norm(raw);

    if (trimmed === '') {
      flush();
      continue;
    }

    const isBullet = BULLET_RE.test(raw) || (i > 0 && /^\s{2,}/.test(raw));

    // Fallback boundary detection when the source didn't preserve blank lines
    // (e.g. PDF rows that visually separate entries collapse into adjacent lines).
    // If we're already past the date row of the current entry and the next 1–2
    // non-bullet lines contain a date pattern, treat THIS line as the title of
    // a new entry.
    if (entry && metaConsumed >= 3 && !isBullet && trimmed.length < 90 && !trimmed.endsWith('.')) {
      let foundDateAhead = false;
      for (let j = i + 1; j < Math.min(i + 3, rawLines.length); j++) {
        const tj = norm(rawLines[j]);
        if (!tj) break;
        if (BULLET_RE.test(rawLines[j])) break;
        if (HAS_DATE_RE.test(tj)) { foundDateAhead = true; break; }
      }
      if (foundDateAhead) flush();
    }

    if (!entry) {
      entry = newEntry();
      details = [];
      metaConsumed = 0;
    }

    if (isBullet) {
      details.push(stripBullet(trimmed));
      continue;
    }

    if (metaConsumed === 0) {
      entry.title = trimmed;
      metaConsumed = 1;
    } else if (metaConsumed === 1) {
      // institution/company line — may contain location after a wide gap
      const segs = trimmed.split(/\s{2,}|\t+|\s+\|\s+/);
      if (kind === 'education') {
        entry.institution = segs[0] || trimmed;
        if (segs[1] && !entry.location) entry.location = segs[1];
      } else {
        entry.company = segs[0] || trimmed;
        if (segs[1] && !entry.location) entry.location = segs[1];
      }
      metaConsumed = 2;
    } else if (metaConsumed === 2) {
      // dates / location line
      const dates = [...trimmed.matchAll(DATE_RANGE_RE)].map((m) => m[0]);
      if (dates.length >= 1) {
        entry.startDate = dates[0];
        if (dates.length >= 2) entry.endDate = dates[1];
        const remainder = trimmed
          .replace(DATE_RANGE_RE, '')
          .replace(/[\s\-–—|,]+/g, ' ')
          .trim();
        if (remainder && !entry.location) entry.location = remainder;
      } else if (!entry.location) {
        entry.location = trimmed;
      }
      metaConsumed = 3;
    } else {
      details.push(trimmed);
    }
  }
  flush();
  return out;
};

/* ---------------------------- summary / tools --------------------------- */

const joinParagraphs = (rawLines) =>
  rawLines.map((l) => norm(l)).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

/* ----------------------------- top-level parse --------------------------- */

/* Recognized markers for the MB Drive JC course-list transcript that the
   resume builder appends after the resume body. When we see one of these,
   we stop parsing the resume content there so it doesn't get vacuumed into
   the last section (e.g. Tools & Technology). */
const TRANSCRIPT_BOUNDARY_RES = [
  /MB-?Drive\s*JC\s+Instructor-?Led\s+Courses/i,
  /MB-?Drive\s*JC\s+e-?Learning\s+Courses/i,
];

export const parseResumeText = (text) => {
  if (!text || typeof text !== 'string') return null;
  // Normalize line endings, strip page-number-only lines, drop trailing whitespace
  let lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .filter((l, i, arr) => {
      const t = l.trim();
      // Drop bare page-number lines like "Page 2 of 3" or just "2"
      if (/^page\s+\d+\s+of\s+\d+$/i.test(t)) return false;
      if (/^\d{1,2}$/.test(t) && i > 0 && arr[i - 1].trim() === '') return false;
      return true;
    });

  // Truncate at the first transcript-addendum marker so the course list never
  // leaks into the resume's last section.
  const boundaryIdx = lines.findIndex((l) =>
    TRANSCRIPT_BOUNDARY_RES.some((re) => re.test(l))
  );
  if (boundaryIdx >= 0) lines = lines.slice(0, boundaryIdx);

  const sections = splitSections(lines);
  const header = parseHeader(sections.header);

  return {
    fullName: header.fullName || '',
    title: header.title || '',
    email: header.email || '',
    phone: header.phone || '',
    linkedinUrl: header.linkedinUrl || '',
    professionalSummary: joinParagraphs(sections.summary),
    certifications: parseListSection(sections.certifications),
    hiddenCertifications: [],
    skills: parseListSection(sections.skills),
    hiddenSkills: [],
    education: parseStructuredEntries(sections.education, 'education'),
    workExperience: parseStructuredEntries(sections.work, 'work'),
    toolsAndTechnology: joinParagraphs(sections.tools),
  };
};

/* ============================ format extractors ========================== */

/* Extracts plain text from a PDF, AND returns any embedded JSON we put in
   the PDF's Keywords metadata at export time. */
export const extractFromPdf = async (file) => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Point at the pdf.worker.min.mjs copy in /public so CRA's dev server can
  // serve it as a static asset. This also prevents webpack from auto-bundling
  // pdfjs's internal worker as a chunk (which 404s under the SPA fallback).
  // The file is kept in sync by the "postinstall" script in package.json.
  // pdfjs-dist v4+ ships the worker as an ESM module (.mjs).
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.mjs`;
  } catch { /* ignore */ }

  const buf = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buf, isEvalSupported: false });
  const pdf = await loadingTask.promise;

  // 1. Check metadata for our embedded JSON
  let embeddedJson = null;
  try {
    const meta = await pdf.getMetadata();
    const info = meta?.info || {};
    const candidates = [info.Keywords, info.Subject, info.keywords, info.subject];
    for (const c of candidates) {
      if (typeof c === 'string' && c.includes(EMBED_MARKER)) {
        const idx = c.indexOf(EMBED_MARKER);
        const payload = c.slice(idx + EMBED_MARKER.length).trim();
        try { embeddedJson = JSON.parse(payload); break; } catch { /* try next */ }
      }
    }
  } catch { /* ignore */ }

  // 2. Extract text from all pages
  const pageTexts = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Reconstruct lines by Y coordinate (pdfjs items have transform[5] = y)
    const itemsByY = new Map();
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      if (!itemsByY.has(y)) itemsByY.set(y, []);
      itemsByY.get(y).push({ x: item.transform[4], str: item.str, width: item.width });
    }
    const sortedY = [...itemsByY.keys()].sort((a, b) => b - a); // top to bottom

    // Estimate typical line height from the median Y-gap so we can detect
    // visually-blank rows (which PDFs encode as larger Y-gaps, not blank lines).
    let lineHeight = 14;
    if (sortedY.length > 1) {
      const gaps = [];
      for (let k = 1; k < sortedY.length; k++) {
        const g = sortedY[k - 1] - sortedY[k];
        if (g > 0) gaps.push(g);
      }
      if (gaps.length) {
        gaps.sort((a, b) => a - b);
        lineHeight = gaps[Math.floor(gaps.length / 2)] || lineHeight;
      }
    }
    const blankGapThreshold = Math.max(lineHeight * 1.6, lineHeight + 4);

    const linesOut = [];
    for (let k = 0; k < sortedY.length; k++) {
      const y = sortedY[k];
      const row = itemsByY.get(y).sort((a, b) => a.x - b.x);
      let line = '';
      let lastEnd = -Infinity;
      for (const it of row) {
        const gap = it.x - lastEnd;
        if (line) {
          if (gap > 30) line += '  ';                                  // column gap
          else if (gap > 2 && !line.endsWith(' ') && !it.str.startsWith(' ')) line += ' ';
          // else: adjacent text runs ("20"+"18" -> "2018"), no space
        }
        line += it.str;
        // Use pdfjs's reported width when available; fall back to a rough estimate.
        const width = typeof it.width === 'number' && it.width > 0 ? it.width : it.str.length * 5;
        lastEnd = it.x + width;
      }
      linesOut.push(line);
      if (k + 1 < sortedY.length) {
        const ydiff = sortedY[k] - sortedY[k + 1];
        if (ydiff > blankGapThreshold) linesOut.push('');
      }
    }
    pageTexts.push(linesOut.join('\n'));
  }

  return { text: pageTexts.join('\n\n'), embeddedJson };
};

export const extractFromDocx = async (file) => {
  const mammothMod = await import('mammoth');
  const mammoth = mammothMod.default || mammothMod;
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return { text: result.value || '', embeddedJson: null };
};

export const extractFromTxt = async (file) => {
  const text = await file.text();
  return { text, embeddedJson: null };
};

export const extractFromJson = async (file) => {
  const text = await file.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON: ${e.message}`); }
  // Accept either the wrapped { data, settings } form (matches our Export JSON)
  // or a bare data object.
  const data = parsed.data || parsed;
  return { text: '', embeddedJson: data, settings: parsed.settings || null };
};

/* High-level dispatcher: pick the right extractor by file type/extension. */
export const importResumeFile = async (file) => {
  const name = (file.name || '').toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isDocx = name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isJson = name.endsWith('.json') || file.type === 'application/json';
  const isTxt = name.endsWith('.txt') || file.type === 'text/plain';

  let extracted;
  if (isJson) extracted = await extractFromJson(file);
  else if (isPdf) extracted = await extractFromPdf(file);
  else if (isDocx) extracted = await extractFromDocx(file);
  else if (isTxt) extracted = await extractFromTxt(file);
  else throw new Error(`Unsupported file type: ${file.name}`);

  // Lossless path: embedded JSON wins.
  if (extracted.embeddedJson) {
    // Our exported payloads are wrapped as { version, profile, data, settings }.
    // extractFromJson already unwraps to the inner data object, but the PDF
    // embed path hands back the whole wrapper. Normalize both here so the inner
    // resume fields (fullName, certifications, education, ...) reach migrateData
    // rather than the wrapper — otherwise the import silently produced an
    // empty/default resume.
    const payload = extracted.embeddedJson;
    const isWrapper =
      payload && typeof payload === 'object' && payload.data && !payload.fullName;
    const data = isWrapper ? payload.data : payload;
    const settings = extracted.settings || (isWrapper ? payload.settings : null) || null;
    return {
      source: isJson ? 'json' : 'embedded',
      data,
      settings,
    };
  }

  // Heuristic fallback: parse extracted text.
  const parsed = parseResumeText(extracted.text);
  if (!parsed) throw new Error('Could not extract any usable text from that file.');
  return { source: isPdf ? 'pdf-text' : isDocx ? 'docx' : 'txt', data: parsed, settings: null };
};
