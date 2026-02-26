import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ResumeBuilder.css';

const PAGE_HEIGHT_PX = 1056; // 11in at 96 DPI
const MAX_PAGES = 5;

const emptyEducation = { title: '', institution: '', startDate: '', endDate: '', location: '', details: [] };
const emptyWork = { title: '', company: '', startDate: '', endDate: '', location: '', details: [] };

const defaultData = {
  fullName: 'Jordan Applicant',
  email: 'jordan@applicant.com',
  phone: '(555) 010-2200',
  title: 'Automotive Technician',
  professionalSummary:
    'Graduating automotive technology student with strong diagnostics, customer service, and shop safety fundamentals. Seeking an entry-level technician role with growth opportunities.',
  certifications: [
    'ASE Entry-Level: Engine Repair',
    'ASE Entry-Level: Brakes',
    'EPA 609 Refrigerant Certification',
    'OSHA 10-Hour Safety',
  ],
  skills: [
    'Brake inspection and service',
    'Electrical testing with DVOM',
    'Routine maintenance and documentation',
    'Scan tool diagnostics',
    'Customer communication',
    'Team collaboration',
  ],
  education: [
    {
      title: 'A.A.S. Automotive Technology',
      institution: 'Metro Technical College',
      startDate: 'August 2024',
      endDate: 'Expected 2026',
      location: 'Austin, TX',
      details: ['Relevant Coursework: Engine Performance, Steering/Suspension, Automotive Electrical'],
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
    },
    {
      title: 'Parts Counter Intern',
      company: 'Midtown Auto Supply',
      startDate: '2023',
      endDate: '2024',
      location: 'Austin, TX',
      details: ['Supported inventory intake, order fulfillment, and customer-facing parts lookup.'],
    },
  ],
  toolsAndTechnology:
    'Mitchell1 / ALLDATA, OBD-II Scan Tools, Torque Wrenches, Battery Analyzer, Tire Mount and Balance Machines.',
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

const parseList = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const ResumeBuilder = () => {
  const [data, setData] = useState(defaultData);
  const [settings, setSettings] = useState(defaultSettings);
  const [fitResult, setFitResult] = useState({ fits: true, pages: 1, overflow: 0 });
  const [allowPagination, setAllowPagination] = useState(false);
  const resumeRef = useRef(null);

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
    // Compare scrollHeight to clientHeight — works regardless of box-sizing
    const overflow = Math.max(node.scrollHeight - node.clientHeight, 0);
    const pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(node.scrollHeight / PAGE_HEIGHT_PX)));
    setFitResult({ fits: overflow <= 0, pages, overflow: Math.round(overflow) });
  }, []);

  useEffect(() => {
    measureFit();
    const raf = requestAnimationFrame(measureFit);
    return () => cancelAnimationFrame(raf);
  }, [data, settings, allowPagination, measureFit]);

  /* ---- Simple field helpers ---- */
  const updateField = (field, value) => setData((prev) => ({ ...prev, [field]: value }));
  const updateListField = (field, value) => setData((prev) => ({ ...prev, [field]: parseList(value) }));
  const updateSetting = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }));

  /* ---- Education CRUD ---- */
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

  /* ---- Work CRUD ---- */
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

  /* ---- Auto-fit ---- */
  const applyAutoFit = () => {
    const next = { ...settings };
    if (!fitResult.fits) {
      next.paragraphSpacing = Math.max(settings.minParagraphSpacing, settings.paragraphSpacing - 2);
      next.lineHeight = Math.max(settings.minLineHeight, Number((settings.lineHeight - 0.04).toFixed(2)));
      next.bodyFontSize = Math.max(settings.minBodyFontSize, settings.bodyFontSize - 1);
      next.sectionSpacing = Math.max(4, settings.sectionSpacing - 2);
    }
    let attempts = 0;
    setSettings((prev) => ({ ...prev, ...next }));
    const runSearch = () => {
      attempts += 1;
      if (attempts > 8) return;
      const node = resumeRef.current;
      if (!node) return;
      if (node.scrollHeight - node.clientHeight <= 0) return;
      setSettings((prev) => ({
        ...prev,
        paragraphSpacing: Math.max(prev.minParagraphSpacing, prev.paragraphSpacing - 1),
        lineHeight: Math.max(prev.minLineHeight, Number((prev.lineHeight - 0.02).toFixed(2))),
        bodyFontSize: Math.max(prev.minBodyFontSize, prev.bodyFontSize - (attempts % 2 === 0 ? 1 : 0)),
        sectionSpacing: Math.max(4, prev.sectionSpacing - 1),
      }));
      requestAnimationFrame(runSearch);
    };
    requestAnimationFrame(runSearch);
  };

  /* ---- Export / Print ---- */
  const doPrint = () => {
    const orig = document.title;
    document.title = `${data.fullName} - Resume`;
    window.print();
    document.title = orig;
  };

  const handleExport = () => {
    if (!fitResult.fits && !allowPagination) {
      const ok = window.confirm(
        `Current content requires approximately ${fitResult.pages} pages. Allow pagination (up to ${MAX_PAGES} pages)?`
      );
      if (!ok) return;
      setAllowPagination(true);
      setTimeout(doPrint, 150);
      return;
    }
    doPrint();
  };

  /* ====================== RENDER ====================== */
  return (
    <div className="resume-builder-page">
      {/* ---------- CONTROLS PANEL ---------- */}
      <div className="resume-builder-controls">
        <h1>Resume Builder</h1>

        {/* ---- Personal Information ---- */}
        <fieldset className="form-section">
          <legend>Personal Information</legend>
          <div className="grid-two">
            <label>
              Full Name
              <input value={data.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
            </label>
            <label>
              Title / Role
              <input value={data.title} onChange={(e) => updateField('title', e.target.value)} />
            </label>
            <label>
              Email
              <input value={data.email} onChange={(e) => updateField('email', e.target.value)} />
            </label>
            <label>
              Phone
              <input value={data.phone} onChange={(e) => updateField('phone', e.target.value)} />
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
          />
        </fieldset>

        {/* ---- Certifications & Skills ---- */}
        <fieldset className="form-section">
          <legend>Certifications &amp; Skills</legend>
          <div className="grid-two">
            <label>
              Certifications (one per line)
              <textarea
                value={data.certifications.join('\n')}
                onChange={(e) => updateListField('certifications', e.target.value)}
                rows={5}
              />
            </label>
            <label>
              Skills (one per line)
              <textarea
                value={data.skills.join('\n')}
                onChange={(e) => updateListField('skills', e.target.value)}
                rows={5}
              />
            </label>
          </div>
        </fieldset>

        {/* ---- Education ---- */}
        <fieldset className="form-section">
          <legend>Education</legend>
          {data.education.map((entry, i) => (
            <div key={i} className="entry-card">
              <div className="entry-card-header">
                <span>Entry {i + 1}</span>
                <button type="button" className="btn-remove" onClick={() => removeEducation(i)}>
                  Remove
                </button>
              </div>
              <div className="grid-two">
                <label>
                  Degree / Certificate
                  <input value={entry.title} onChange={(e) => updateEducation(i, 'title', e.target.value)} />
                </label>
                <label>
                  Institution
                  <input
                    value={entry.institution}
                    onChange={(e) => updateEducation(i, 'institution', e.target.value)}
                  />
                </label>
                <label>
                  Start Date
                  <input
                    value={entry.startDate}
                    onChange={(e) => updateEducation(i, 'startDate', e.target.value)}
                  />
                </label>
                <label>
                  End Date
                  <input
                    value={entry.endDate}
                    onChange={(e) => updateEducation(i, 'endDate', e.target.value)}
                  />
                </label>
                <label>
                  Location
                  <input
                    value={entry.location}
                    onChange={(e) => updateEducation(i, 'location', e.target.value)}
                  />
                </label>
              </div>
              <label>
                Details (one per line)
                <textarea
                  value={entry.details.join('\n')}
                  onChange={(e) => updateEducationDetails(i, e.target.value)}
                  rows={2}
                />
              </label>
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
            <div key={i} className="entry-card">
              <div className="entry-card-header">
                <span>Entry {i + 1}</span>
                <button type="button" className="btn-remove" onClick={() => removeWork(i)}>
                  Remove
                </button>
              </div>
              <div className="grid-two">
                <label>
                  Job Title
                  <input value={entry.title} onChange={(e) => updateWork(i, 'title', e.target.value)} />
                </label>
                <label>
                  Company
                  <input
                    value={entry.company}
                    onChange={(e) => updateWork(i, 'company', e.target.value)}
                  />
                </label>
                <label>
                  Start Date
                  <input
                    value={entry.startDate}
                    onChange={(e) => updateWork(i, 'startDate', e.target.value)}
                  />
                </label>
                <label>
                  End Date
                  <input
                    value={entry.endDate}
                    onChange={(e) => updateWork(i, 'endDate', e.target.value)}
                  />
                </label>
                <label>
                  Location
                  <input
                    value={entry.location}
                    onChange={(e) => updateWork(i, 'location', e.target.value)}
                  />
                </label>
              </div>
              <label>
                Details (one per line)
                <textarea
                  value={entry.details.join('\n')}
                  onChange={(e) => updateWorkDetails(i, e.target.value)}
                  rows={2}
                />
              </label>
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

        {/* ---- Actions ---- */}
        <div className="action-row">
          <button type="button" onClick={measureFit}>
            Check Fit
          </button>
          <button type="button" onClick={applyAutoFit}>
            Auto-fit
          </button>
          <button type="button" onClick={handleExport}>
            Export / Print
          </button>
        </div>

        <p className={`fit-indicator ${fitResult.fits ? 'fits' : 'overflow'}`}>
          {fitResult.fits
            ? 'Fits on one page.'
            : `Overflow detected (${fitResult.overflow}px). Estimated pages: ${fitResult.pages}.`}
        </p>
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
            <img
              src={`${process.env.PUBLIC_URL}/resume-logo.png`}
              alt="Logo"
              className="resume-logo"
            />
            <h1>{data.fullName}</h1>
            <p className="contact-line">
              <a href={`mailto:${data.email}`}>{data.email}</a>
              {data.phone && <> | Cell: {data.phone}</>}
            </p>
            {data.title && <p className="title-line">{data.title}</p>}
          </header>

          {/* ---- Professional Summary ---- */}
          {data.professionalSummary && (
            <section>
              <h3>Professional Summary</h3>
              <p>{data.professionalSummary}</p>
            </section>
          )}

          {/* ---- Certifications ---- */}
          {data.certifications.length > 0 && (
            <section>
              <h3>Certifications</h3>
              <ul className="two-col-list">
                {data.certifications.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* ---- Skills ---- */}
          {data.skills.length > 0 && (
            <section>
              <h3>Skills</h3>
              <ul className="two-col-list">
                {data.skills.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* ---- Education ---- */}
          {data.education.length > 0 && (
            <section>
              <h3>Education</h3>
              {data.education.map((entry, i) => (
                <div key={i} className="structured-entry">
                  {entry.title && <div className="se-title">{entry.title}</div>}
                  {entry.institution && <div className="se-institution">{entry.institution}</div>}
                  {(entry.startDate || entry.endDate || entry.location) && (
                    <div className="se-meta">
                      {(entry.startDate || entry.endDate) && (
                        <span className="se-dates">
                          {entry.startDate}
                          {entry.endDate ? ` \u2013 ${entry.endDate}` : ''}
                        </span>
                      )}
                      {entry.location && <span className="se-location">{entry.location}</span>}
                    </div>
                  )}
                  {entry.details.length > 0 && (
                    <ul className="se-details">
                      {entry.details.map((d, j) => (
                        <li key={j}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* ---- Work Experience ---- */}
          {data.workExperience.length > 0 && (
            <section>
              <h3>Work Experience</h3>
              {data.workExperience.map((entry, i) => (
                <div key={i} className="structured-entry">
                  {entry.title && <div className="se-title">{entry.title}</div>}
                  {entry.company && <div className="se-institution">{entry.company}</div>}
                  {(entry.startDate || entry.endDate || entry.location) && (
                    <div className="se-meta">
                      {(entry.startDate || entry.endDate) && (
                        <span className="se-dates">
                          {entry.startDate}
                          {entry.endDate ? ` \u2013 ${entry.endDate}` : ''}
                        </span>
                      )}
                      {entry.location && <span className="se-location">{entry.location}</span>}
                    </div>
                  )}
                  {entry.details.length > 0 && (
                    <ul className="se-details">
                      {entry.details.map((d, j) => (
                        <li key={j}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
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

export default ResumeBuilder;
