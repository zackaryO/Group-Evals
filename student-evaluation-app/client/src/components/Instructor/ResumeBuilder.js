import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ResumeBuilder.css';

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

/* ===================== Main component ===================== */

const ResumeBuilder = () => {
  const initial = useMemo(buildInitialState, []);
  const [profiles, setProfiles] = useState(initial.profiles);
  const [activeProfile, setActiveProfile] = useState(initial.activeProfile);
  const [fitResult, setFitResult] = useState({ fits: true, pages: 1, overflow: 0, usedPct: 0 });
  const [allowPagination, setAllowPagination] = useState(false);
  const [breakWarnings, setBreakWarnings] = useState([]);
  const [pdfBusy, setPdfBusy] = useState(false);

  const resumeRef = useRef(null);
  const controlsRef = useRef(null);
  const fileInputRef = useRef(null);
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
     (pushing siblings) and grow the panel if the row would overflow. ---- */
  useEffect(() => {
    const panel = controlsRef.current;
    if (!panel || typeof ResizeObserver === 'undefined') return;

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

    const handleResize = (entries) => {
      for (const entry of entries) {
        const el = entry.target;
        const label = el.closest('label');
        if (!label || !panel.contains(label)) continue;
        if (el.style.width) {
          label.style.flex = `0 0 ${el.offsetWidth}px`;
        } else if (label.style.flex) {
          label.style.flex = '';
        }
      }
      syncRow();
    };

    const ro = new ResizeObserver(handleResize);
    const observe = (root) => {
      root
        .querySelectorAll('.grid-two textarea, .grid-two input')
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

  const exportPDF = async () => {
    const node = resumeRef.current;
    if (!node) return;
    const wasPaginated = allowPagination;
    if (!fitResult.fits && !wasPaginated) {
      const ok = window.confirm(
        `Current content requires approximately ${fitResult.pages} pages. Allow pagination (up to ${MAX_PAGES} pages)?`
      );
      if (!ok) return;
      setAllowPagination(true);
      // Wait a frame so the DOM expands before capture
      await new Promise((r) => setTimeout(r, 250));
    }
    setPdfBusy(true);
    try {
      const html2canvasMod = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const html2canvas = html2canvasMod.default || html2canvasMod;

      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: PAGE_WIDTH_PX,
      });

      const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
      const pageWidthIn = 8.5;
      const pageHeightIn = 11;
      const pxPerIn = canvas.width / pageWidthIn;
      const pageSlicePx = pageHeightIn * pxPerIn;

      let yOffset = 0;
      let isFirst = true;
      while (yOffset < canvas.height - 1) {
        const sliceHeight = Math.min(pageSlicePx, canvas.height - yOffset);
        const slice = document.createElement('canvas');
        slice.width = canvas.width;
        slice.height = Math.ceil(sliceHeight);
        const ctx = slice.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, -yOffset);
        const dataUrl = slice.toDataURL('image/jpeg', 0.95);
        if (!isFirst) pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidthIn, sliceHeight / pxPerIn);
        yOffset += sliceHeight;
        isFirst = false;
      }
      pdf.save(`${safeFilename(data.fullName)}.pdf`);
    } catch (err) {
      window.alert(`PDF export failed: ${err.message}`);
    } finally {
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

        {/* ---- Actions ---- */}
        <div className="action-row">
          <button type="button" onClick={measureFit}>Check Fit</button>
          <button type="button" onClick={applyAutoFit}>Auto-fit</button>
          <button type="button" onClick={resetLayout} title="Reset textarea sizes and panel width">
            Reset Layout
          </button>
          <button type="button" onClick={handlePrint}>Print</button>
          <button type="button" onClick={exportPDF} disabled={pdfBusy}>
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
      </div>

      {/* ---------- RESUME PREVIEW ---------- */}
      <div className="resume-preview-shell">
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
                <ul className="two-col-list">
                  {items.map((b, i) => (
                    <li
                      key={i}
                      className={b.indent ? `bullet-indent-${b.indent}` : ''}
                    >
                      {b.text}
                    </li>
                  ))}
                </ul>
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
                <ul className="two-col-list">
                  {items.map((b, i) => (
                    <li
                      key={i}
                      className={b.indent ? `bullet-indent-${b.indent}` : ''}
                    >
                      {b.text}
                    </li>
                  ))}
                </ul>
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
      </div>
    </div>
  );
};

// `cleanList` retained for any external callers; not used in the component anymore.
export { cleanList };
export default ResumeBuilder;
