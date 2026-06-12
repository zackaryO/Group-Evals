import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ResumeBuilder.css';
import { importResumeFile, EMBED_MARKER } from './resumeParser';
import TranscriptAddendum from './TranscriptAddendum';

const PAGE_HEIGHT_PX = 1056; // 11in at 96 DPI
const PAGE_WIDTH_PX = 816;   // 8.5in at 96 DPI
const MAX_PAGES = 5;
const STORAGE_KEY = 'resumeBuilder.profiles.v1';
const SCHOOL_URL = 'https://mbdrivejc.com/';
const SCHOOL_LABEL = 'mbdrivejc.com';
const AUTOSAVE_DEBOUNCE_MS = 600;
const ORPHAN_HEADER_THRESHOLD_PX = 60; // header within this distance of page bottom = warning

const emptyEducation = {
  title: '', institution: '', startDate: '', endDate: '', location: '',
  details: [], hiddenDetails: [],
};
const emptyWork = {
  title: '', company: '', startDate: '', endDate: '', location: '',
  details: [], hiddenDetails: [],
};

const defaultData = {
  fullName: 'MB Drive JC Applicant',
  email: 'Theo@applicant.com',
  phone: '(555) 010-2200',
  linkedinUrl: '',
  title: 'MB Drive JC Graduate',
  professionalSummary:
    'Graduating automotive technology student with strong diagnostics, customer service, and shop safety fundamentals. Seeking to build real-world proficiency in a professional automotive environment while demonstrating a passion for precision work and continuous learning.',
  certifications: [
    'Mercedes-Benz DRIVE Certificate of Completion',
    'EPA 609 Refrigerant Certification',
    'S/P2 Automotive Service Safety.',
    'S/P2 Automotive Service Pollution Prevention',
    'Pro-Cut Level 1 (on-car brake lathe)',
  ],
  hiddenCertifications: [],
  skills: [
    'Technical writing (RO documentation)',
    'Competent with Diagnostic Strategy 1 (DS1)',
    'Proficient in DVOM usage',
    'Proficient in Mercedes-Benz systems: WIS, DWD, StarTek NG, etc.',
    'Customer service and communication',
    'Electrical/Electronic diagnosis and repair',
    'Brake inspection and service',
    'Electrical testing with DVOM',
    'Routine maintenance and documentation',
    'Scan tool diagnostics',
    'Customer communication',
    'Team collaboration',
    'Maintence and repair of automotive systems (A/B Services)',
    'Pre-delivery inspection (PDI)',
  ],
  hiddenSkills: [],
  education: [
    {
      title: 'Mercedes-Benz DRIVE JC Certificate of Completion',
      institution: 'LETC, Clearfield Job Corps',
      startDate: 'January 2026',
      endDate: 'Expected July 2026',
      location: 'Clearfield, UT',
      details: [
        'Completed full ASE Education Foundation Automotive Service Technician (AST) task list and 15 Mercedes-Benz instructor-led courses in an 18-week, factory-aligned program',
        'Earned High Voltage Qualification for Plug-In Hybrid Electric Vehicles, including manual power-down procedures',
        'Trained hands-on with factory systems including WIS, XENTRY Diagnosis, StarTek NG, DWD, and Tips Reader',
        'Practiced vehicle protection protocols, proper lifting procedures, and responsible tool use on every task',
      ],
      hiddenDetails: [],
    },
    {
      title: 'Maintenance and Light Repair (MLR)',
      institution: 'LETC, Clearfield Job Corps',
      startDate: 'August 2024',
      endDate: 'Expected 2026',
      location: 'Clearfield, UT',
      details: ['Relevant Coursework: Engine Performance, Steering/Suspension, Automotive Electrical, ACDelco e-Learning Modules.'],
      hiddenDetails: [],
    },
  ],
  workExperience: [
    {
      title: 'Shop Assistant',
      company: 'Fast Lane Auto',
      startDate: '2024',
      endDate: 'Present',
      location: 'Austin, TX',
      details: ['Assisted technicians with inspections, oil services, and bay preparation.'],
      hiddenDetails: [],
    },
    {
      title: 'Parts Counter Intern',
      company: 'Midtown Auto Supply',
      startDate: '2023',
      endDate: '2024',
      location: 'Austin, TX',
      details: ['Supported inventory intake, order fulfillment, and customer-facing parts lookup.'],
      hiddenDetails: [],
    },
  ],
  toolsAndTechnology:
    'Mitchell (ShopKey Pro) / ALLDATA, XENTRY Diagnosis Scan Tool, Digital Torque Wrenches, Battery Analyzer, Tire Mount and Balance Machines.',
};

const defaultSettings = {
  fontFamily: 'Arial, sans-serif',
  bodyFontSize: 11,
  lineHeight: 1.3,
  paragraphSpacing: 4,
  sectionSpacing: 6,
  minBodyFontSize: 9,
  maxBodyFontSize: 13,
  minLineHeight: 1.1,
  maxLineHeight: 1.45,
  minParagraphSpacing: 2,
  maxParagraphSpacing: 14,
  // Append the MB Drive JC course-list transcript as the last pages of every
  // printed / exported resume. Stored per-profile so off-program resumes can opt out.
  includeTranscript: true,
};

const fontOptions = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
];

/* ===================== Utilities ===================== */

const parseList = (text) => text.split('\n');

const cleanList = (arr) => (Array.isArray(arr) ? arr.map((s) => (s || '').trim()).filter(Boolean) : []);

// Returns [{ text, indent }] preserving leading-space indentation as logical levels (2 spaces = 1 level).
const parseBulletItems = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((line) => {
      const raw = line || '';
      const leading = (raw.match(/^[ \t]*/) || [''])[0].length;
      return { text: raw.trim(), indent: Math.min(4, Math.floor(leading / 2)) };
    })
    .filter((b) => b.text);

const sanitizeUrl = (url) => {
  const t = (url || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
};

const labelForUrl = (url) => (url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const safeFilename = (s) => (s || 'resume').replace(/[^a-z0-9_-]+/gi, '_');

/* Migrate a partial/legacy data object into the current shape. */
const migrateData = (raw) => {
  const r = raw || {};
  const out = {
    ...defaultData,
    ...r,
    hiddenCertifications: Array.isArray(r.hiddenCertifications) ? r.hiddenCertifications : [],
    hiddenSkills: Array.isArray(r.hiddenSkills) ? r.hiddenSkills : [],
    linkedinUrl: typeof r.linkedinUrl === 'string' ? r.linkedinUrl : '',
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    skills: Array.isArray(r.skills) ? r.skills : [],
  };
  out.education = (Array.isArray(r.education) ? r.education : []).map((e) => ({
    ...emptyEducation,
    ...(e || {}),
    details: Array.isArray(e?.details) ? e.details : [],
    hiddenDetails: Array.isArray(e?.hiddenDetails) ? e.hiddenDetails : [],
  }));
  out.workExperience = (Array.isArray(r.workExperience) ? r.workExperience : []).map((e) => ({
    ...emptyWork,
    ...(e || {}),
    details: Array.isArray(e?.details) ? e.details : [],
    hiddenDetails: Array.isArray(e?.hiddenDetails) ? e.hiddenDetails : [],
  }));
  return out;
};

const migrateSettings = (raw) => ({ ...defaultSettings, ...(raw || {}) });

const loadStorage = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveStorage = (state) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / disabled — ignore */
  }
};

const buildInitialState = () => {
  const saved = loadStorage();
  if (saved && saved.profiles && Object.keys(saved.profiles).length > 0) {
    const profiles = {};
    for (const name of Object.keys(saved.profiles)) {
      profiles[name] = {
        data: migrateData(saved.profiles[name]?.data),
        settings: migrateSettings(saved.profiles[name]?.settings),
      };
    }
    const active =
      saved.activeProfile && profiles[saved.activeProfile]
        ? saved.activeProfile
        : Object.keys(profiles)[0];
    return { profiles, activeProfile: active };
  }
  return {
    profiles: { Default: { data: defaultData, settings: defaultSettings } },
    activeProfile: 'Default',
  };
};

/* Tab / Shift+Tab handler for bullet textareas — insert/remove 2-space leading indent. */
const handleBulletKeyDown = (e, value, onChange) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const ta = e.target;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = value;
  const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const nlAfter = text.indexOf('\n', start);
  const lineEnd = nlAfter === -1 ? text.length : nlAfter;
  const lineText = text.slice(lineStart, lineEnd);

  if (e.shiftKey) {
    const removeCount = Math.min(2, (lineText.match(/^ */) || [''])[0].length);
    if (removeCount === 0) return;
    const next = text.slice(0, lineStart) + lineText.slice(removeCount) + text.slice(lineEnd);
    onChange(next);
    requestAnimationFrame(() => {
      const ns = Math.max(lineStart, start - removeCount);
      const ne = Math.max(lineStart, end - removeCount);
      try { ta.setSelectionRange(ns, ne); } catch { /* */ }
    });
  } else {
    const next = text.slice(0, lineStart) + '  ' + text.slice(lineStart);
    onChange(next);
    requestAnimationFrame(() => {
      try { ta.setSelectionRange(start + 2, end + 2); } catch { /* */ }
    });
  }
};

/* ===================== Bullet visibility (collapsible) ===================== */

const BulletVisibility = ({ items, hidden, onToggle }) => {
  const parsed = parseBulletItems(items);
  if (parsed.length === 0) return null;
  const hiddenCount = parsed.filter((b) => hidden.includes(b.text)).length;
  return (
    <details className="bullet-visibility">
      <summary>
        Show / hide bullets&nbsp;
        <span className="bullet-visibility-status">
          ({hiddenCount > 0 ? `${hiddenCount} hidden` : 'all visible'})
        </span>
      </summary>
      <ul>
        {parsed.map((b, i) => {
          const isHidden = hidden.includes(b.text);
          return (
            <li key={`${b.text}-${i}`}>
              <label className={isHidden ? 'is-hidden' : ''}>
                <input
                  type="checkbox"
                  checked={!isHidden}
                  onChange={() => onToggle(b.text)}
                />
                <span style={{ paddingLeft: `${b.indent * 12}px` }}>{b.text}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </details>
  );
};

/* ===================== Two-column list (CSS-columns alternative) =====================
   CSS `columns: 2` doesn't capture well in html2canvas, so we split the
   items into two halves (top→bottom, fill-first-column style) and lay them
   out with flexbox instead. */
const TwoColList = ({ items }) => {
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);
  return (
    <div className="two-col-list">
      <ul className="two-col-half">
        {left.map((b, i) => (
          <li key={`l-${i}`} className={b.indent ? `bullet-indent-${b.indent}` : ''}>
            {b.text}
          </li>
        ))}
      </ul>
      <ul className="two-col-half">
        {right.map((b, i) => (
          <li key={`r-${i}`} className={b.indent ? `bullet-indent-${b.indent}` : ''}>
            {b.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ===================== Main component ===================== */

const ResumeBuilder = () => {
  const initial = useMemo(buildInitialState, []);
  const [profiles, setProfiles] = useState(initial.profiles);
  const [activeProfile, setActiveProfile] = useState(initial.activeProfile);
  const [fitResult, setFitResult] = useState({ fits: true, pages: 1, overflow: 0, usedPct: 0 });
  const [allowPagination, setAllowPagination] = useState(false);
  const [breakWarnings, setBreakWarnings] = useState([]);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [showPreviewHint, setShowPreviewHint] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { kind, msg }
  const [isDragOver, setIsDragOver] = useState(false);

  const resumeRef = useRef(null);
  const documentRef = useRef(null);
  const previewShellRef = useRef(null);
  const controlsRef = useRef(null);
  const resizeHandleRef = useRef(null);
  // Set to true once the user drags the panel resize handle, and cleared by
  // Reset Layout. While true, the ResizeObserver-driven auto-grow behaviors
  // are suppressed so the panel stays exactly where the user dragged it.
  const panelWidthPinnedRef = useRef(false);
  const fileInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const dragSourceRef = useRef(null); // { listKey, idx }
  const activeProfileRef = useRef(activeProfile);
  activeProfileRef.current = activeProfile;

  // Derived: data + settings of the active profile
  const data = profiles[activeProfile]?.data || defaultData;
  const settings = profiles[activeProfile]?.settings || defaultSettings;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const setData = useCallback((updater) => {
    setProfiles((prev) => {
      const ap = activeProfileRef.current;
      const cur = prev[ap];
      if (!cur) return prev;
      const newData = typeof updater === 'function' ? updater(cur.data) : updater;
      if (newData === cur.data) return prev;
      return { ...prev, [ap]: { ...cur, data: newData } };
    });
  }, []);

  const setSettings = useCallback((updater) => {
    setProfiles((prev) => {
      const ap = activeProfileRef.current;
      const cur = prev[ap];
      if (!cur) return prev;
      const newSettings = typeof updater === 'function' ? updater(cur.settings) : updater;
      if (newSettings === cur.settings) return prev;
      return { ...prev, [ap]: { ...cur, settings: newSettings } };
    });
  }, []);

  /* ---- Auto-save (debounced) ---- */
  useEffect(() => {
    const id = setTimeout(() => {
      saveStorage({ activeProfile, profiles });
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [profiles, activeProfile]);

  /* ---- Style variables ---- */
  const styles = useMemo(
    () => ({
      '--resume-font-family': settings.fontFamily,
      '--resume-font-size': `${settings.bodyFontSize}px`,
      '--resume-line-height': settings.lineHeight,
      '--resume-paragraph-spacing': `${settings.paragraphSpacing}px`,
      '--resume-section-spacing': `${settings.sectionSpacing}px`,
    }),
    [settings]
  );

  /* ---- Measurement ---- */
  const measureFit = useCallback(() => {
    const node = resumeRef.current;
    if (!node) return;
    const overflow = Math.max(node.scrollHeight - node.clientHeight, 0);
    const totalHeight = allowPagination ? node.scrollHeight : node.scrollHeight; // both: use real content height
    const pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(totalHeight / PAGE_HEIGHT_PX)));
    const usedPct = Math.min(500, Math.round((node.scrollHeight / PAGE_HEIGHT_PX) * 100));
    setFitResult({ fits: overflow <= 0, pages, overflow: Math.round(overflow), usedPct });

    if (allowPagination && pages > 1) {
      const headers = Array.from(node.querySelectorAll('h3'));
      const warnings = [];
      headers.forEach((h) => {
        const top = h.offsetTop;
        const within = top % PAGE_HEIGHT_PX;
        if (within > PAGE_HEIGHT_PX - ORPHAN_HEADER_THRESHOLD_PX) {
          warnings.push({
            label: h.textContent || '(unnamed section)',
            page: Math.floor(top / PAGE_HEIGHT_PX) + 1,
          });
        }
      });
      setBreakWarnings(warnings);
    } else if (breakWarnings.length > 0) {
      setBreakWarnings([]);
    }
  }, [allowPagination, breakWarnings.length]);

  useEffect(() => {
    measureFit();
    const raf = requestAnimationFrame(measureFit);
    return () => cancelAnimationFrame(raf);
  }, [data, settings, allowPagination, measureFit]);

  /* ---- Push-to-grow: when a textarea is user-resized, expand its label
     (pushing siblings) and grow the panel if the row would overflow.
     Watches every textarea/input in the panel, not just .grid-two ones,
     so the standalone Education/Work "Details" textareas can also push
     the panel wider instead of slipping under the preview. ---- */
  useEffect(() => {
    const panel = controlsRef.current;
    if (!panel || typeof ResizeObserver === 'undefined') return;

    const isInGridTwo = (label) =>
      !!(label.parentElement && label.parentElement.classList.contains('grid-two'));

    const syncRow = () => {
      panel.querySelectorAll('.grid-two').forEach((grid) => {
        const cs = getComputedStyle(grid);
        const gap = parseFloat(cs.columnGap || cs.gap) || 8;
        const items = Array.from(grid.children);
        if (items.length === 0) return;
        const hasExplicit = items.some(
          (c) => c.style.flex && c.style.flex.startsWith('0 0')
        );
        if (!hasExplicit) return;
        const sum =
          items.reduce((s, c) => s + c.offsetWidth, 0) +
          Math.max(0, items.length - 1) * gap;
        if (sum > grid.clientWidth + 4) {
          const need = sum - grid.clientWidth + 16;
          panel.style.width = `${panel.offsetWidth + need}px`;
        }
      });
    };

    /* If any user-resized input extends past the panel's right edge, grow
       the panel to fit. Filters on `el.style.width` so only user-drag
       resizes trigger growth (not the initial layout). */
    const growForOverflow = () => {
      const panelRect = panel.getBoundingClientRect();
      const padR = parseFloat(getComputedStyle(panel).paddingRight) || 0;
      let maxOverflow = 0;
      panel.querySelectorAll('textarea, input').forEach((el) => {
        if (!el.style.width) return;
        const elRect = el.getBoundingClientRect();
        const overflow = elRect.right - (panelRect.right - padR);
        if (overflow > maxOverflow) maxOverflow = overflow;
      });
      if (maxOverflow > 4) {
        panel.style.width = `${panel.offsetWidth + maxOverflow + 16}px`;
      }
    };

    // ALL layout-mutating work is deferred to the next animation frame:
    // mutating layout synchronously inside a ResizeObserver callback (even
    // just label.style.flex) is what triggers the "ResizeObserver loop
    // completed with undelivered notifications" runtime error.
    let rafScheduled = false;
    const pendingPins = new Map(); // label -> textarea/input to pin it to
    const handleResize = (entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const label = el.closest('label');
        if (!label || !panel.contains(label)) continue;
        // Only the .grid-two layout needs its cell's flex pinned so
        // siblings can be pushed. Standalone labels just need the panel
        // to be wide enough; growForOverflow() handles that.
        if (isInGridTwo(label)) pendingPins.set(label, el);
      }
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        for (const [label, el] of pendingPins) {
          if (el.style.width) {
            label.style.flex = `0 0 ${el.offsetWidth}px`;
          } else if (label.style.flex) {
            label.style.flex = '';
          }
        }
        pendingPins.clear();
        // Once the user has chosen a panel width via the handle, never auto-
        // grow the panel again — that was the source of the snap-back fight.
        if (panelWidthPinnedRef.current) return;
        syncRow();
        growForOverflow();
      });
    };

    const ro = new ResizeObserver(handleResize);
    const observe = (root) => {
      root
        .querySelectorAll('textarea, input')
        .forEach((el) => ro.observe(el));
    };
    observe(panel);

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1 && n.querySelectorAll) observe(n);
        });
      }
    });
    mo.observe(panel, { childList: true, subtree: true });

    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  /* ---- Preview-below chevron visibility ----
     Only meaningful in stacked layout (phone). We show the hint when the
     preview shell sits below the visible viewport and isn't yet scrolled to. */
  useEffect(() => {
    const update = () => {
      const stacked = window.matchMedia('(max-width: 720px)').matches;
      if (!stacked) {
        setShowPreviewHint(false);
        return;
      }
      const shell = previewShellRef.current;
      if (!shell) {
        setShowPreviewHint(false);
        return;
      }
      const rect = shell.getBoundingClientRect();
      // Hide once the preview's top edge is at or above the viewport bottom
      // (i.e. user has scrolled enough that the preview is starting to appear).
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      setShowPreviewHint(rect.top > viewportH - 40);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  /* ---- Custom drag-handle for the controls panel ----
     The native CSS `resize: horizontal` handle is only the tiny bottom-right
     corner, which can be obscured by scrollbars or fall off-screen when the
     panel grows. This full-height handle on the panel's right edge stays
     reachable so the user can always drag the panel narrower (or wider). */
  useEffect(() => {
    const handle = resizeHandleRef.current;
    const panel = controlsRef.current;
    if (!handle || !panel) return;

    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    const onPointerDown = (e) => {
      dragging = true;
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      handle.classList.add('is-dragging');
      // From this moment on, the panel width is user-owned: no observer is
      // allowed to grow it back. Also release any prior child width pins so
      // they don't constrain the new size; the user can re-resize a textarea
      // afterward if they want.
      panelWidthPinnedRef.current = true;
      panel.querySelectorAll('textarea, input').forEach((el) => {
        if (el.style.width) el.style.width = '';
      });
      panel.querySelectorAll('.grid-two > label').forEach((l) => {
        if (l.style.flex) l.style.flex = '';
      });
      try { handle.setPointerCapture(e.pointerId); } catch { /* */ }
      e.preventDefault();
    };
    const onPointerMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const min = 320;
      const max = window.innerWidth - 80;
      const next = Math.max(min, Math.min(max, startWidth + dx));
      panel.style.width = `${next}px`;
    };
    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove('is-dragging');
      try { handle.releasePointerCapture(e.pointerId); } catch { /* */ }
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
    return () => {
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerUp);
      handle.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  /* ---- Reset all user-resized textareas to default flex layout ---- */
  const resetLayout = () => {
    const panel = controlsRef.current;
    if (!panel) return;
    panel
      .querySelectorAll('.grid-two textarea, .grid-two input')
      .forEach((el) => {
        el.style.width = '';
        el.style.height = '';
      });
    panel.querySelectorAll('.grid-two > label').forEach((l) => {
      l.style.flex = '';
    });
    panel.style.width = '';
    panelWidthPinnedRef.current = false;
  };

  /* ---- Field helpers ---- */
  const updateField = (field, value) => setData((prev) => ({ ...prev, [field]: value }));
  const updateListField = (field, value) =>
    setData((prev) => ({ ...prev, [field]: parseList(value) }));
  const updateSetting = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }));

  const toggleHiddenSimple = (field, value) => {
    setData((prev) => {
      const arr = Array.isArray(prev[field]) ? prev[field] : [];
      const idx = arr.indexOf(value);
      const next = idx >= 0 ? arr.filter((_, i) => i !== idx) : [...arr, value];
      return { ...prev, [field]: next };
    });
  };

  const toggleHiddenInList = (listKey, idx, value) => {
    setData((prev) => {
      const list = Array.isArray(prev[listKey]) ? prev[listKey] : [];
      return {
        ...prev,
        [listKey]: list.map((entry, i) => {
          if (i !== idx) return entry;
          const cur = Array.isArray(entry.hiddenDetails) ? entry.hiddenDetails : [];
          const ix = cur.indexOf(value);
          const next = ix >= 0 ? cur.filter((_, j) => j !== ix) : [...cur, value];
          return { ...entry, hiddenDetails: next };
        }),
      };
    });
  };

  /* ---- Education / Work CRUD ---- */
  const addEducation = () =>
    setData((prev) => ({ ...prev, education: [...prev.education, { ...emptyEducation }] }));
  const removeEducation = (idx) =>
    setData((prev) => ({ ...prev, education: prev.education.filter((_, i) => i !== idx) }));
  const updateEducation = (idx, field, value) =>
    setData((prev) => ({
      ...prev,
      education: prev.education.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }));
  const updateEducationDetails = (idx, value) =>
    setData((prev) => ({
      ...prev,
      education: prev.education.map((e, i) => (i === idx ? { ...e, details: parseList(value) } : e)),
    }));

  const addWork = () =>
    setData((prev) => ({ ...prev, workExperience: [...prev.workExperience, { ...emptyWork }] }));
  const removeWork = (idx) =>
    setData((prev) => ({ ...prev, workExperience: prev.workExperience.filter((_, i) => i !== idx) }));
  const updateWork = (idx, field, value) =>
    setData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }));
  const updateWorkDetails = (idx, value) =>
    setData((prev) => ({
      ...prev,
      workExperience: prev.workExperience.map((e, i) =>
        i === idx ? { ...e, details: parseList(value) } : e
      ),
    }));

  /* ---- Drag-to-reorder for entry-cards (Education + Work) ---- */
  const onEntryDragStart = (e, listKey, idx) => {
    dragSourceRef.current = { listKey, idx };
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', `${listKey}:${idx}`); } catch { /* */ }
    e.currentTarget.classList.add('dragging');
  };
  const onEntryDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    document
      .querySelectorAll('.entry-card.drag-over')
      .forEach((n) => n.classList.remove('drag-over'));
    dragSourceRef.current = null;
  };
  const onEntryDragOver = (e, listKey) => {
    const src = dragSourceRef.current;
    if (!src || src.listKey !== listKey) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };
  const onEntryDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };
  const onEntryDrop = (e, listKey, idx) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const src = dragSourceRef.current;
    if (!src || src.listKey !== listKey) return;
    if (src.idx === idx) return;
    setData((prev) => {
      const arr = Array.isArray(prev[listKey]) ? [...prev[listKey]] : [];
      const [moved] = arr.splice(src.idx, 1);
      arr.splice(idx, 0, moved);
      return { ...prev, [listKey]: arr };
    });
    dragSourceRef.current = null;
  };

  /* ---- Profile management ---- */
  const profileNames = Object.keys(profiles);

  const newProfile = () => {
    const name = (window.prompt('New profile name:') || '').trim();
    if (!name) return;
    if (profiles[name]) {
      window.alert('A profile with that name already exists.');
      return;
    }
    setProfiles((prev) => ({ ...prev, [name]: { data: defaultData, settings: defaultSettings } }));
    setActiveProfile(name);
  };
  const duplicateProfile = () => {
    const name = (window.prompt('Duplicate as:', `${activeProfile} copy`) || '').trim();
    if (!name) return;
    if (profiles[name]) {
      window.alert('A profile with that name already exists.');
      return;
    }
    setProfiles((prev) => ({
      ...prev,
      [name]: {
        data: JSON.parse(JSON.stringify(prev[activeProfile].data)),
        settings: { ...prev[activeProfile].settings },
      },
    }));
    setActiveProfile(name);
  };
  const renameProfile = () => {
    const name = (window.prompt('Rename profile:', activeProfile) || '').trim();
    if (!name || name === activeProfile) return;
    if (profiles[name]) {
      window.alert('A profile with that name already exists.');
      return;
    }
    setProfiles((prev) => {
      const next = {};
      for (const k of Object.keys(prev)) {
        next[k === activeProfile ? name : k] = prev[k];
      }
      return next;
    });
    setActiveProfile(name);
  };
  const deleteProfile = () => {
    if (Object.keys(profiles).length <= 1) {
      window.alert('Cannot delete the last profile.');
      return;
    }
    if (!window.confirm(`Delete profile "${activeProfile}"? This cannot be undone.`)) return;
    const remaining = Object.keys(profiles).filter((k) => k !== activeProfile);
    setProfiles((prev) => {
      const next = { ...prev };
      delete next[activeProfile];
      return next;
    });
    setActiveProfile(remaining[0]);
  };

  /* ---- JSON import / export ---- */
  const exportJSON = () => {
    const payload = {
      version: 1,
      profile: activeProfile,
      data,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFilename(data.fullName)}__${safeFilename(activeProfile)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const triggerImport = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };
  const onImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedData = migrateData(parsed.data || parsed);
      const importedSettings = migrateSettings(parsed.settings);
      const choice = window.confirm(
        `Import into a new profile?\n\nOK = create new profile\nCancel = overwrite "${activeProfile}"`
      );
      if (choice) {
        const baseName = parsed.profile || file.name.replace(/\.json$/i, '') || 'Imported';
        let name = baseName;
        let n = 2;
        while (profiles[name]) name = `${baseName} (${n++})`;
        setProfiles((prev) => ({ ...prev, [name]: { data: importedData, settings: importedSettings } }));
        setActiveProfile(name);
      } else {
        setProfiles((prev) => ({
          ...prev,
          [activeProfile]: { data: importedData, settings: importedSettings },
        }));
      }
    } catch (err) {
      window.alert(`Could not import JSON: ${err.message}`);
    }
  };

  /* ---- Resume upload (PDF / DOCX / TXT / JSON) ----
     Round-trips losslessly for PDFs we exported (via embedded JSON in
     Keywords metadata); falls back to a heuristic text parse otherwise. */
  const triggerUpload = () => {
    if (uploadInputRef.current) uploadInputRef.current.click();
  };
  const handleUploadedFile = useCallback(async (file) => {
    if (!file) return;
    setUploadBusy(true);
    setUploadStatus(null);
    try {
      const { source, data: importedRaw, settings: importedSettings } = await importResumeFile(file);
      const importedData = migrateData(importedRaw);
      const mergedSettings = importedSettings ? migrateSettings(importedSettings) : settings;

      const choice = window.confirm(
        `Import as a new profile?\n\nOK = create new profile\nCancel = overwrite "${activeProfile}"`
      );
      if (choice) {
        const baseName = file.name.replace(/\.(pdf|docx|txt|json)$/i, '') || 'Imported';
        let name = baseName;
        let n = 2;
        while (profiles[name]) name = `${baseName} (${n++})`;
        setProfiles((prev) => ({ ...prev, [name]: { data: importedData, settings: mergedSettings } }));
        setActiveProfile(name);
      } else {
        setProfiles((prev) => ({
          ...prev,
          [activeProfile]: { data: importedData, settings: mergedSettings },
        }));
      }

      const sourceLabel = {
        embedded: 'Loaded from embedded resume data (perfect round-trip).',
        json: 'Loaded from JSON.',
        'pdf-text': 'Parsed from PDF text — review fields for accuracy.',
        docx: 'Parsed from DOCX — review fields for accuracy.',
        txt: 'Parsed from text — review fields for accuracy.',
      }[source] || 'Resume imported.';
      setUploadStatus({ kind: 'success', msg: sourceLabel });
    } catch (err) {
      setUploadStatus({ kind: 'error', msg: `Upload failed: ${err.message}` });
    } finally {
      setUploadBusy(false);
    }
  }, [activeProfile, profiles, settings]);

  const onUploadFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    handleUploadedFile(file);
  };
  const onDropZoneDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const onDropZoneDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const onDropZoneDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleUploadedFile(file);
  };

  /* ---- Auto-fit (bidirectional, minimal-step, oscillation-aware) ---- */
  const applyAutoFit = () => {
    let attempts = 0;
    const maxAttempts = 80;
    const TARGET_SLACK = 24;
    let lastDirection = null;

    const tick = () => {
      attempts += 1;
      if (attempts > maxAttempts) return;
      const node = resumeRef.current;
      if (!node) return;

      const overflow = node.scrollHeight - node.clientHeight;
      const slack = -overflow;

      let direction;
      if (overflow > 0) direction = 'shrink';
      else if (slack > TARGET_SLACK) direction = 'grow';
      else return;

      const overshoot = lastDirection === 'grow' && direction === 'shrink';

      const cur = settingsRef.current;
      const next = { ...cur };
      let changed = false;

      if (direction === 'shrink') {
        if (next.paragraphSpacing > next.minParagraphSpacing) {
          next.paragraphSpacing = Math.max(next.minParagraphSpacing, next.paragraphSpacing - 1);
          changed = true;
        } else if (next.lineHeight > next.minLineHeight + 0.001) {
          next.lineHeight = Math.max(next.minLineHeight, Number((next.lineHeight - 0.02).toFixed(2)));
          changed = true;
        } else if (next.sectionSpacing > 4) {
          next.sectionSpacing = Math.max(4, next.sectionSpacing - 1);
          changed = true;
        } else if (next.bodyFontSize > next.minBodyFontSize) {
          next.bodyFontSize = Math.max(
            next.minBodyFontSize,
            Number((next.bodyFontSize - 0.5).toFixed(1))
          );
          changed = true;
        }
      } else {
        if (next.lineHeight < next.maxLineHeight - 0.001) {
          next.lineHeight = Math.min(next.maxLineHeight, Number((next.lineHeight + 0.02).toFixed(2)));
          changed = true;
        } else if (next.paragraphSpacing < next.maxParagraphSpacing) {
          next.paragraphSpacing = Math.min(next.maxParagraphSpacing, next.paragraphSpacing + 1);
          changed = true;
        } else if (next.sectionSpacing < 16) {
          next.sectionSpacing = Math.min(16, next.sectionSpacing + 1);
          changed = true;
        } else if (next.bodyFontSize < next.maxBodyFontSize) {
          next.bodyFontSize = Math.min(
            next.maxBodyFontSize,
            Number((next.bodyFontSize + 0.5).toFixed(1))
          );
          changed = true;
        }
      }

      if (!changed) return;

      setSettings(next);
      settingsRef.current = next;

      if (overshoot) return;
      lastDirection = direction;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  /* ---- Print + PDF export ---- */
  const doPrint = () => {
    const orig = document.title;
    document.title = `${data.fullName} - Resume`;
    window.print();
    document.title = orig;
  };
  const handlePrint = () => {
    if (!fitResult.fits && !allowPagination) {
      const ok = window.confirm(
        `Current content requires approximately ${fitResult.pages} pages. Allow pagination (up to ${MAX_PAGES} pages)?`
      );
      if (!ok) return;
      setAllowPagination(true);
      setTimeout(doPrint, 200);
      return;
    }
    doPrint();
  };

  /* "Export PDF" downloads a PDF file directly with no print dialog. It uses
     the same filename convention as Print -> Save as PDF ("<Full Name> -
     Resume.pdf") and embeds the full resume payload in the PDF metadata so the
     Upload Resume flow round-trips it losslessly. Print remains the path for
     paper copies / a selectable-text PDF. */
  const pdfFilename = () =>
    `${(data.fullName || 'Resume').replace(/[\\/:*?"<>|]/g, '-').trim()} - Resume.pdf`;

  const exportPDF = async () => {
    const source = documentRef.current;
    if (!source) return;
    if (!fitResult.fits && !allowPagination) {
      const ok = window.confirm(
        `Current content requires approximately ${fitResult.pages} pages. Allow pagination (up to ${MAX_PAGES} pages)?`
      );
      if (!ok) return;
      setAllowPagination(true);
      // Wait a frame so the DOM expands before capture
      await new Promise((r) => setTimeout(r, 250));
    }
    setPdfBusy(true);

    // Render an isolated off-screen clone at native 816px width so the
    // capture isn't affected by viewport size, horizontal scroll position,
    // shadow cropping, or media queries.
    const stage = document.createElement('div');
    stage.className = 'resume-export-stage';
    stage.style.width = `${PAGE_WIDTH_PX}px`;
    const clone = source.cloneNode(true);
    // Strip preview-only visuals on the clone (box-shadow, gap, etc).
    clone.style.gap = '0';
    clone.querySelectorAll('.resume-page, .transcript-page').forEach((el) => {
      el.style.boxShadow = 'none';
      el.style.margin = '0';
    });
    stage.appendChild(clone);
    document.body.appendChild(stage);

    try {
      const html2canvasMod = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const html2canvas = html2canvasMod.default || html2canvasMod;

      // Let layout settle and images load before capture.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const imgs = Array.from(clone.querySelectorAll('img'));
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.onload = res;
                img.onerror = res;
              })
        )
      );

      const fullHeight = stage.scrollHeight;
      // scale: 3 gives ~288 dpi at letter size, which keeps text edges crisp.
      // Paired with high-quality JPEG below: at this resolution the JPEG
      // artifacts are invisible, while lossless PNG ran ~20 MB/page and made
      // 60+ MB files that couldn't be emailed or re-imported.
      const canvas = await html2canvas(stage, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: PAGE_WIDTH_PX,
        height: fullHeight,
        windowWidth: PAGE_WIDTH_PX,
        windowHeight: fullHeight,
        scrollX: 0,
        scrollY: 0,
      });

      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });

      // Embed the full resume payload in the PDF's Keywords metadata so the
      // Upload Resume flow can round-trip our own PDFs losslessly.
      try {
        const payload = JSON.stringify({ version: 1, profile: activeProfile, data, settings });
        pdf.setProperties({
          title: `${data.fullName || 'Resume'} - Resume`,
          subject: 'Resume',
          author: data.fullName || '',
          keywords: `${EMBED_MARKER}${payload}`,
          creator: 'MB Drive JC Resume Builder',
        });
      } catch { /* metadata is best-effort */ }

      const pageWidthIn = 8.5;
      const pageHeightIn = 11;
      const pxPerIn = canvas.width / pageWidthIn;
      const pageSlicePx = pageHeightIn * pxPerIn;

      // Prefer to break at the natural document boundaries (.resume-page,
      // .transcript-page). We find their on-stage tops, scale to canvas px,
      // and use them as cut points so a section never gets sliced across
      // pages.
      const stageRect = stage.getBoundingClientRect();
      const breakNodes = Array.from(clone.querySelectorAll('.resume-page, .transcript-page'));
      const scale = canvas.height / stage.scrollHeight;
      const breakOffsetsPx = breakNodes
        .map((el) => Math.round((el.getBoundingClientRect().top - stageRect.top) * scale))
        .filter((y) => y > 0);
      const cutPoints = [0, ...breakOffsetsPx, canvas.height];

      let isFirst = true;
      // Canvas-Y range each emitted PDF page covers, so link annotations
      // below can be placed on the right page.
      const pageRanges = [];
      for (let i = 0; i < cutPoints.length - 1; i++) {
        const yStart = cutPoints[i];
        const yEnd = cutPoints[i + 1];
        const blockHeight = yEnd - yStart;
        if (blockHeight <= 1) continue;
        // Within a logical block, slice into letter-page chunks.
        let yOff = 0;
        while (yOff < blockHeight - 1) {
          const sliceH = Math.min(pageSlicePx, blockHeight - yOff);
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = Math.ceil(sliceH);
          const ctx = slice.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, -(yStart + yOff));
          // High-quality JPEG (0.92): visually indistinguishable from lossless
          // at the scale-3 capture resolution, ~20-30x smaller than PNG. The
          // slice is pre-filled white above, so JPEG's lack of alpha is fine.
          const dataUrl = slice.toDataURL('image/jpeg', 0.92);
          if (!isFirst) pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidthIn, sliceH / pxPerIn);
          pageRanges.push({ start: yStart + yOff, end: yStart + yOff + sliceH });
          yOff += sliceH;
          isFirst = false;
        }
      }

      // The page images themselves are not clickable, so overlay invisible
      // link annotations at each anchor's rendered position (email, LinkedIn,
      // school site, ...). Best-effort: a failure here must not block export.
      try {
        const scaleX = canvas.width / stageRect.width;
        clone.querySelectorAll('a[href]').forEach((a) => {
          const href = a.href; // resolved absolute URL; mailto: kept as-is
          if (!href) return;
          const r = a.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return;
          const cx = (r.left - stageRect.left) * scaleX;
          const cyTop = (r.top - stageRect.top) * scale;
          const cyMid = cyTop + (r.height * scale) / 2;
          const pageIdx = pageRanges.findIndex((p) => cyMid >= p.start && cyMid < p.end);
          if (pageIdx === -1) return;
          pdf.setPage(pageIdx + 1);
          pdf.link(
            cx / pxPerIn,
            (cyTop - pageRanges[pageIdx].start) / pxPerIn,
            (r.width * scaleX) / pxPerIn,
            (r.height * scale) / pxPerIn,
            { url: href }
          );
        });
      } catch { /* links are best-effort */ }

      pdf.save(pdfFilename());
    } catch (err) {
      window.alert(`PDF export failed: ${err.message}`);
    } finally {
      if (stage.parentNode) stage.parentNode.removeChild(stage);
      setPdfBusy(false);
    }
  };

  /* ====================== RENDER ====================== */
  const fillBarColor =
    fitResult.usedPct < 90 ? '#3fb950' : fitResult.usedPct <= 100 ? '#d29922' : '#f85149';

  return (
    <div className="resume-builder-page">
      {/* ---------- CONTROLS PANEL ---------- */}
      <div className="resume-builder-controls" ref={controlsRef}>
        {/* Full-height drag handle on the right edge — pull either direction
            to resize the panel. Always reachable, unlike the native corner. */}
        <div
          className="panel-resize-handle"
          ref={resizeHandleRef}
          title="Drag to resize panel"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize controls panel"
        />
        <h1>Resume Builder</h1>

        {/* ---- Profiles bar ---- */}
        <div className="profile-bar">
          <label className="profile-select">
            Profile
            <select value={activeProfile} onChange={(e) => setActiveProfile(e.target.value)}>
              {profileNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <div className="profile-bar-actions">
            <button type="button" onClick={newProfile} title="Create blank profile">New</button>
            <button type="button" onClick={duplicateProfile} title="Duplicate current profile">Duplicate</button>
            <button type="button" onClick={renameProfile} title="Rename current profile">Rename</button>
            <button
              type="button"
              onClick={deleteProfile}
              title="Delete current profile"
              className="btn-danger"
              disabled={profileNames.length <= 1}
            >
              Delete
            </button>
          </div>
          <div className="profile-bar-actions">
            <button type="button" onClick={exportJSON} title="Export current profile as JSON">Export JSON</button>
            <button type="button" onClick={triggerImport} title="Import JSON file">Import JSON</button>
            <input
              type="file"
              accept="application/json"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={onImportFile}
            />
          </div>

          <div
            className={`upload-resume${isDragOver ? ' dragging' : ''}`}
            onDragOver={onDropZoneDragOver}
            onDragEnter={onDropZoneDragOver}
            onDragLeave={onDropZoneDragLeave}
            onDrop={onDropZoneDrop}
            title="Upload a resume to pre-populate the form. Our own PDFs round-trip losslessly; others are parsed heuristically."
          >
            <button type="button" onClick={triggerUpload} disabled={uploadBusy}>
              {uploadBusy ? 'Reading…' : 'Upload Resume'}
            </button>
            <span>or drop a PDF / DOCX / TXT / JSON file here</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.json,application/pdf,application/json,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              ref={uploadInputRef}
              style={{ display: 'none' }}
              onChange={onUploadFile}
            />
            {uploadStatus && (
              <span className={`upload-resume-status ${uploadStatus.kind}`}>
                {uploadStatus.msg}
              </span>
            )}
          </div>

          <p className="profile-saved-hint">
            Saved automatically to this browser. {profileNames.length} profile{profileNames.length === 1 ? '' : 's'}.
          </p>
        </div>

        {/* ---- Personal Information ---- */}
        <fieldset className="form-section">
          <legend>Personal Information</legend>
          <div className="grid-two">
            <label>
              Full Name
              <input value={data.fullName} onChange={(e) => updateField('fullName', e.target.value)} spellCheck />
            </label>
            <label>
              Title / Role
              <input value={data.title} onChange={(e) => updateField('title', e.target.value)} spellCheck />
            </label>
            <label>
              Email
              <input value={data.email} onChange={(e) => updateField('email', e.target.value)} spellCheck={false} />
            </label>
            <label>
              Phone
              <input value={data.phone} onChange={(e) => updateField('phone', e.target.value)} spellCheck={false} />
            </label>
            <label>
              LinkedIn URL
              <input
                type="url"
                placeholder="https://www.linkedin.com/in/your-handle"
                value={data.linkedinUrl}
                onChange={(e) => updateField('linkedinUrl', e.target.value)}
                spellCheck={false}
              />
            </label>
          </div>
        </fieldset>

        {/* ---- Professional Summary ---- */}
        <fieldset className="form-section">
          <legend>Professional Summary</legend>
          <textarea
            value={data.professionalSummary}
            onChange={(e) => updateField('professionalSummary', e.target.value)}
            rows={3}
            spellCheck
          />
        </fieldset>

        {/* ---- Certifications & Skills ---- */}
        <fieldset className="form-section">
          <legend>Certifications &amp; Skills</legend>
          <div className="grid-two">
            <label>
              Certifications (one per line; Tab to indent)
              <textarea
                value={data.certifications.join('\n')}
                onChange={(e) => updateListField('certifications', e.target.value)}
                onKeyDown={(e) =>
                  handleBulletKeyDown(e, data.certifications.join('\n'), (v) =>
                    updateListField('certifications', v)
                  )
                }
                rows={5}
                spellCheck
              />
              <BulletVisibility
                items={data.certifications}
                hidden={data.hiddenCertifications}
                onToggle={(text) => toggleHiddenSimple('hiddenCertifications', text)}
              />
            </label>
            <label>
              Skills (one per line; Tab to indent)
              <textarea
                value={data.skills.join('\n')}
                onChange={(e) => updateListField('skills', e.target.value)}
                onKeyDown={(e) =>
                  handleBulletKeyDown(e, data.skills.join('\n'), (v) =>
                    updateListField('skills', v)
                  )
                }
                rows={5}
                spellCheck
              />
              <BulletVisibility
                items={data.skills}
                hidden={data.hiddenSkills}
                onToggle={(text) => toggleHiddenSimple('hiddenSkills', text)}
              />
            </label>
          </div>
        </fieldset>

        {/* ---- Education ---- */}
        <fieldset className="form-section">
          <legend>Education</legend>
          {data.education.map((entry, i) => (
            <div
              key={i}
              className="entry-card"
              onDragOver={(e) => onEntryDragOver(e, 'education')}
              onDragLeave={onEntryDragLeave}
              onDrop={(e) => onEntryDrop(e, 'education', i)}
            >
              <div className="entry-card-header">
                <span
                  className="drag-handle"
                  draggable
                  onDragStart={(e) => onEntryDragStart(e, 'education', i)}
                  onDragEnd={onEntryDragEnd}
                  title="Drag to reorder"
                >
                  &#x2630;
                </span>
                <span className="entry-card-label">Entry {i + 1}</span>
                <button type="button" className="btn-remove" onClick={() => removeEducation(i)}>
                  Remove
                </button>
              </div>
              <div className="grid-two">
                <label>
                  Degree / Certificate
                  <input value={entry.title} onChange={(e) => updateEducation(i, 'title', e.target.value)} spellCheck />
                </label>
                <label>
                  Institution
                  <input
                    value={entry.institution}
                    onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                    spellCheck
                  />
                </label>
                <label>
                  Start Date
                  <input
                    value={entry.startDate}
                    onChange={(e) => updateEducation(i, 'startDate', e.target.value)}
                    spellCheck={false}
                  />
                </label>
                <label>
                  End Date
                  <input
                    value={entry.endDate}
                    onChange={(e) => updateEducation(i, 'endDate', e.target.value)}
                    spellCheck={false}
                  />
                </label>
                <label>
                  Location
                  <input
                    value={entry.location}
                    onChange={(e) => updateEducation(i, 'location', e.target.value)}
                    spellCheck
                  />
                </label>
              </div>
              <label>
                Details (one per line; Tab to indent)
                <textarea
                  value={entry.details.join('\n')}
                  onChange={(e) => updateEducationDetails(i, e.target.value)}
                  onKeyDown={(e) =>
                    handleBulletKeyDown(e, entry.details.join('\n'), (v) =>
                      updateEducationDetails(i, v)
                    )
                  }
                  rows={2}
                  spellCheck
                />
              </label>
              <BulletVisibility
                items={entry.details}
                hidden={entry.hiddenDetails || []}
                onToggle={(text) => toggleHiddenInList('education', i, text)}
              />
            </div>
          ))}
          <button type="button" className="btn-add" onClick={addEducation}>
            + Add Education
          </button>
        </fieldset>

        {/* ---- Work Experience ---- */}
        <fieldset className="form-section">
          <legend>Work Experience</legend>
          {data.workExperience.map((entry, i) => (
            <div
              key={i}
              className="entry-card"
              onDragOver={(e) => onEntryDragOver(e, 'workExperience')}
              onDragLeave={onEntryDragLeave}
              onDrop={(e) => onEntryDrop(e, 'workExperience', i)}
            >
              <div className="entry-card-header">
                <span
                  className="drag-handle"
                  draggable
                  onDragStart={(e) => onEntryDragStart(e, 'workExperience', i)}
                  onDragEnd={onEntryDragEnd}
                  title="Drag to reorder"
                >
                  &#x2630;
                </span>
                <span className="entry-card-label">Entry {i + 1}</span>
                <button type="button" className="btn-remove" onClick={() => removeWork(i)}>
                  Remove
                </button>
              </div>
              <div className="grid-two">
                <label>
                  Job Title
                  <input value={entry.title} onChange={(e) => updateWork(i, 'title', e.target.value)} spellCheck />
                </label>
                <label>
                  Company
                  <input
                    value={entry.company}
                    onChange={(e) => updateWork(i, 'company', e.target.value)}
                    spellCheck
                  />
                </label>
                <label>
                  Start Date
                  <input
                    value={entry.startDate}
                    onChange={(e) => updateWork(i, 'startDate', e.target.value)}
                    spellCheck={false}
                  />
                </label>
                <label>
                  End Date
                  <input
                    value={entry.endDate}
                    onChange={(e) => updateWork(i, 'endDate', e.target.value)}
                    spellCheck={false}
                  />
                </label>
                <label>
                  Location
                  <input
                    value={entry.location}
                    onChange={(e) => updateWork(i, 'location', e.target.value)}
                    spellCheck
                  />
                </label>
              </div>
              <label>
                Details (one per line; Tab to indent)
                <textarea
                  value={entry.details.join('\n')}
                  onChange={(e) => updateWorkDetails(i, e.target.value)}
                  onKeyDown={(e) =>
                    handleBulletKeyDown(e, entry.details.join('\n'), (v) =>
                      updateWorkDetails(i, v)
                    )
                  }
                  rows={2}
                  spellCheck
                />
              </label>
              <BulletVisibility
                items={entry.details}
                hidden={entry.hiddenDetails || []}
                onToggle={(text) => toggleHiddenInList('workExperience', i, text)}
              />
            </div>
          ))}
          <button type="button" className="btn-add" onClick={addWork}>
            + Add Work Experience
          </button>
        </fieldset>

        {/* ---- Tools & Technology ---- */}
        <fieldset className="form-section">
          <legend>Tools &amp; Technology</legend>
          <textarea
            value={data.toolsAndTechnology}
            onChange={(e) => updateField('toolsAndTechnology', e.target.value)}
            rows={3}
            spellCheck
          />
        </fieldset>

        {/* ---- Layout Settings ---- */}
        <fieldset className="form-section">
          <legend>Layout Settings</legend>

          <label>
            Font Family
            <select value={settings.fontFamily} onChange={(e) => updateSetting('fontFamily', e.target.value)}>
              {fontOptions.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <div className="setting-row">
            <span className="setting-label">Font Size</span>
            <div className="setting-slider">
              <input
                type="range"
                min={settings.minBodyFontSize}
                max={settings.maxBodyFontSize}
                step={0.5}
                value={settings.bodyFontSize}
                onChange={(e) => updateSetting('bodyFontSize', Number(e.target.value))}
              />
            </div>
            <input
              type="number"
              className="setting-number"
              min={1}
              max={30}
              step={0.5}
              value={settings.bodyFontSize}
              onChange={(e) => updateSetting('bodyFontSize', Number(e.target.value))}
            />
            <span className="setting-unit">px</span>
          </div>
          <div className="setting-bounds">
            Auto-fit min:
            <input type="number" value={settings.minBodyFontSize} onChange={(e) => updateSetting('minBodyFontSize', Number(e.target.value))} />
            max:
            <input type="number" value={settings.maxBodyFontSize} onChange={(e) => updateSetting('maxBodyFontSize', Number(e.target.value))} />
          </div>

          <div className="setting-row">
            <span className="setting-label">Line Height</span>
            <div className="setting-slider">
              <input
                type="range"
                min={settings.minLineHeight}
                max={settings.maxLineHeight}
                step={0.01}
                value={settings.lineHeight}
                onChange={(e) => updateSetting('lineHeight', Number(e.target.value))}
              />
            </div>
            <input
              type="number"
              className="setting-number"
              min={0.8}
              max={3}
              step={0.05}
              value={settings.lineHeight}
              onChange={(e) => updateSetting('lineHeight', Number(e.target.value))}
            />
          </div>
          <div className="setting-bounds">
            Auto-fit min:
            <input type="number" step="0.01" value={settings.minLineHeight} onChange={(e) => updateSetting('minLineHeight', Number(e.target.value))} />
            max:
            <input type="number" step="0.01" value={settings.maxLineHeight} onChange={(e) => updateSetting('maxLineHeight', Number(e.target.value))} />
          </div>

          <div className="setting-row">
            <span className="setting-label">Paragraph Spacing</span>
            <div className="setting-slider">
              <input
                type="range"
                min={settings.minParagraphSpacing}
                max={settings.maxParagraphSpacing}
                step={1}
                value={settings.paragraphSpacing}
                onChange={(e) => updateSetting('paragraphSpacing', Number(e.target.value))}
              />
            </div>
            <input
              type="number"
              className="setting-number"
              min={0}
              max={30}
              step={1}
              value={settings.paragraphSpacing}
              onChange={(e) => updateSetting('paragraphSpacing', Number(e.target.value))}
            />
            <span className="setting-unit">px</span>
          </div>
          <div className="setting-bounds">
            Auto-fit min:
            <input type="number" value={settings.minParagraphSpacing} onChange={(e) => updateSetting('minParagraphSpacing', Number(e.target.value))} />
            max:
            <input type="number" value={settings.maxParagraphSpacing} onChange={(e) => updateSetting('maxParagraphSpacing', Number(e.target.value))} />
          </div>

          <div className="setting-row">
            <span className="setting-label">Section Spacing</span>
            <div className="setting-slider">
              <input
                type="range"
                min={2}
                max={20}
                step={1}
                value={settings.sectionSpacing}
                onChange={(e) => updateSetting('sectionSpacing', Number(e.target.value))}
              />
            </div>
            <input
              type="number"
              className="setting-number"
              min={0}
              max={30}
              step={1}
              value={settings.sectionSpacing}
              onChange={(e) => updateSetting('sectionSpacing', Number(e.target.value))}
            />
            <span className="setting-unit">px</span>
          </div>
        </fieldset>

        {/* ---- Pagination toggle ---- */}
        <div className="pagination-toggle">
          <label>
            <input
              type="checkbox"
              checked={allowPagination}
              onChange={(e) => setAllowPagination(e.target.checked)}
            />
            Allow multi-page (up to {MAX_PAGES} pages)
          </label>
        </div>

        {/* ---- Transcript-addendum toggle ---- */}
        <div className="pagination-toggle">
          <label title="Append the MB Drive JC course-list transcript as the final pages of the printed/exported resume.">
            <input
              type="checkbox"
              checked={settings.includeTranscript !== false}
              onChange={(e) => updateSetting('includeTranscript', e.target.checked)}
            />
            Include MB Drive JC transcript addendum
          </label>
        </div>

        {/* ---- Actions ---- */}
        <div className="action-row">
          <button type="button" onClick={measureFit}>Check Fit</button>
          <button type="button" onClick={applyAutoFit}>Auto-fit</button>
          <button type="button" onClick={resetLayout} title="Reset textarea sizes and panel width">
            Reset Layout
          </button>
          <button type="button" onClick={handlePrint}>Print</button>
          <button type="button" onClick={exportPDF} disabled={pdfBusy} title="Download the resume as a PDF file">
            {pdfBusy ? 'Generating PDF…' : 'Export PDF'}
          </button>
        </div>

        {/* ---- Page-fill indicator ---- */}
        <div className="page-fill-wrap" title={`${fitResult.usedPct}% of one page used`}>
          <div className="page-fill-track">
            <div
              className="page-fill-bar"
              style={{
                width: `${Math.min(100, fitResult.usedPct)}%`,
                background: fillBarColor,
              }}
            />
            {fitResult.usedPct > 100 && (
              <div className="page-fill-overflow-marker" />
            )}
          </div>
          <div className="page-fill-meta">
            <span>{fitResult.usedPct}% of page 1</span>
            {!fitResult.fits && (
              <span className="overflow-hint">Overflow {fitResult.overflow}px · ~{fitResult.pages} pages</span>
            )}
          </div>
        </div>

        <p className={`fit-indicator ${fitResult.fits ? 'fits' : 'overflow'}`}>
          {fitResult.fits
            ? 'Fits on one page.'
            : `Overflow detected (${fitResult.overflow}px). Estimated pages: ${fitResult.pages}.`}
        </p>

        {breakWarnings.length > 0 && (
          <div className="break-warnings">
            <strong>Section break warnings:</strong>
            <ul>
              {breakWarnings.map((w, i) => (
                <li key={i}>
                  &quot;{w.label}&quot; sits near the bottom of page {w.page} — consider adjusting spacing or content order.
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---- Dancing chevron: stacked-layout hint that preview is below ---- */}
        <div
          className={`preview-below-hint${showPreviewHint ? '' : ' is-hidden'}`}
          aria-hidden={!showPreviewHint}
        >
          <span>Preview below</span>
          <span className="chevron">&#x2304;</span>
          <span className="chevron">&#x2304;</span>
          <span className="chevron">&#x2304;</span>
        </div>
      </div>

      {/* ---------- RESUME PREVIEW ---------- */}
      <div className="resume-preview-shell" ref={previewShellRef}>
       <div className="resume-document" ref={documentRef}>
        <div
          className={`resume-page ${allowPagination ? 'allow-pagination' : ''}`}
          ref={resumeRef}
          style={styles}
        >
          {/* ---- Header ---- */}
          <header className="resume-header">
            <div className="resume-header-left">
              <img
                src={`${process.env.PUBLIC_URL}/resume-logo.png`}
                alt="Logo"
                className="resume-logo"
              />
              <a
                className="resume-school-link"
                href={SCHOOL_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {SCHOOL_LABEL}
              </a>
            </div>
            <div className="resume-header-center">
              <h1>{data.fullName}</h1>
              <div className="resume-header-contact-row">
                <p className="contact-line">
                  <a href={`mailto:${data.email}`}>{data.email}</a>
                  {data.phone && <> | Cell: {data.phone}</>}
                </p>
                {data.linkedinUrl && (
                  <a
                    className="resume-linkedin-link"
                    href={sanitizeUrl(data.linkedinUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {labelForUrl(sanitizeUrl(data.linkedinUrl))}
                  </a>
                )}
              </div>
              {data.title && <p className="title-line">{data.title}</p>}
            </div>
          </header>

          {/* ---- Professional Summary ---- */}
          {data.professionalSummary && (
            <section>
              <h3>Professional Summary</h3>
              <p>{data.professionalSummary}</p>
            </section>
          )}

          {/* ---- Certifications ---- */}
          {(() => {
            const items = parseBulletItems(data.certifications)
              .filter((b) => !data.hiddenCertifications.includes(b.text));
            if (items.length === 0) return null;
            return (
              <section>
                <h3>Certifications</h3>
                <TwoColList items={items} />
              </section>
            );
          })()}

          {/* ---- Skills ---- */}
          {(() => {
            const items = parseBulletItems(data.skills)
              .filter((b) => !data.hiddenSkills.includes(b.text));
            if (items.length === 0) return null;
            return (
              <section>
                <h3>Skills</h3>
                <TwoColList items={items} />
              </section>
            );
          })()}

          {/* ---- Education ---- */}
          {data.education.length > 0 && (
            <section>
              <h3>Education</h3>
              {data.education.map((entry, i) => {
                const details = parseBulletItems(entry.details).filter(
                  (b) => !(entry.hiddenDetails || []).includes(b.text)
                );
                return (
                  <div key={i} className="structured-entry">
                    {entry.title && <div className="se-title">{entry.title}</div>}
                    {entry.institution && <div className="se-institution">{entry.institution}</div>}
                    {(entry.startDate || entry.endDate || entry.location) && (
                      <div className="se-meta">
                        {(entry.startDate || entry.endDate) && (
                          <span className="se-dates">
                            {entry.startDate}
                            {entry.endDate ? ` – ${entry.endDate}` : ''}
                          </span>
                        )}
                        {entry.location && <span className="se-location">{entry.location}</span>}
                      </div>
                    )}
                    {details.length > 0 && (
                      <ul className="se-details">
                        {details.map((b, j) => (
                          <li
                            key={j}
                            className={b.indent ? `bullet-indent-${b.indent}` : ''}
                          >
                            {b.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* ---- Work Experience ---- */}
          {data.workExperience.length > 0 && (
            <section>
              <h3>Work Experience</h3>
              {data.workExperience.map((entry, i) => {
                const details = parseBulletItems(entry.details).filter(
                  (b) => !(entry.hiddenDetails || []).includes(b.text)
                );
                return (
                  <div key={i} className="structured-entry">
                    {entry.title && <div className="se-title">{entry.title}</div>}
                    {entry.company && <div className="se-institution">{entry.company}</div>}
                    {(entry.startDate || entry.endDate || entry.location) && (
                      <div className="se-meta">
                        {(entry.startDate || entry.endDate) && (
                          <span className="se-dates">
                            {entry.startDate}
                            {entry.endDate ? ` – ${entry.endDate}` : ''}
                          </span>
                        )}
                        {entry.location && <span className="se-location">{entry.location}</span>}
                      </div>
                    )}
                    {details.length > 0 && (
                      <ul className="se-details">
                        {details.map((b, j) => (
                          <li
                            key={j}
                            className={b.indent ? `bullet-indent-${b.indent}` : ''}
                          >
                            {b.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* ---- Tools & Technology ---- */}
          {data.toolsAndTechnology && (
            <section>
              <h3>Tools &amp; Technology</h3>
              <p>{data.toolsAndTechnology}</p>
            </section>
          )}
        </div>

        {/* ---- Transcript addendum (per-profile toggle, on by default) ---- */}
        {settings.includeTranscript && <TranscriptAddendum />}
       </div>
      </div>
    </div>
  );
};

// `cleanList` retained for any external callers; not used in the component anymore.
export { cleanList };
export default ResumeBuilder;
