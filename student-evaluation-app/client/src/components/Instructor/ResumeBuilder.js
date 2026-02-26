import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ResumeBuilder.css';

const PAGE_HEIGHT_PX = 1056;
const MAX_PAGES = 5;

const defaultData = {
  fullName: 'Jordan Applicant',
  email: 'jordan@applicant.com',
  phone: '(555) 010-2200',
  location: 'Austin, TX',
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
    'A.A.S. Automotive Technology — Metro Technical College (Expected 2026)',
    'Relevant Coursework: Engine Performance, Steering/Suspension, Automotive Electrical',
  ],
  workExperience: [
    'Shop Assistant — Fast Lane Auto (2024–Present): Assisted technicians with inspections, oil services, and bay preparation.',
    'Parts Counter Intern — Midtown Auto Supply (2023–2024): Supported inventory intake, order fulfillment, and customer-facing parts lookup.',
  ],
  toolsAndTechnology: [
    'Mitchell1 / ALLDATA',
    'OBD-II Scan Tools',
    'Torque Wrenches',
    'Battery Analyzer',
    'Tire Mount and Balance Machines',
  ],
};

const defaultSettings = {
  fontFamily: 'Arial, sans-serif',
  bodyFontSize: 12,
  lineHeight: 1.35,
  paragraphSpacing: 10,
  sectionSpacing: 12,
  minBodyFontSize: 10,
  maxBodyFontSize: 13,
  minLineHeight: 1.15,
  maxLineHeight: 1.45,
  minParagraphSpacing: 6,
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

  const isDenseEducation = data.education.length > 2;
  const isDenseWorkExperience = data.workExperience.length > 2;

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

  const measureFit = () => {
    const node = resumeRef.current;
    if (!node) return;

    const overflow = Math.max(node.scrollHeight - PAGE_HEIGHT_PX, 0);
    const pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(node.scrollHeight / PAGE_HEIGHT_PX)));
    setFitResult({
      fits: overflow <= 0,
      pages,
      overflow: Math.round(overflow),
    });
  };

  useEffect(() => {
    measureFit();
    const raf = requestAnimationFrame(measureFit);
    return () => cancelAnimationFrame(raf);
  }, [data, settings, allowPagination]);

  const updateField = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

  const updateListField = (field, value) => setData((prev) => ({ ...prev, [field]: parseList(value) }));

  const updateSetting = (field, value) => setSettings((prev) => ({ ...prev, [field]: value }));

  const applyAutoFit = () => {
    const next = { ...settings };

    if (data.education.length > 2 || data.workExperience.length > 2) {
      setAllowPagination(false);
    }

    if (!fitResult.fits) {
      next.paragraphSpacing = Math.max(settings.minParagraphSpacing, settings.paragraphSpacing - 2);
      next.lineHeight = Math.max(settings.minLineHeight, Number((settings.lineHeight - 0.04).toFixed(2)));
      next.bodyFontSize = Math.max(settings.minBodyFontSize, settings.bodyFontSize - 1);
      next.sectionSpacing = Math.max(8, settings.sectionSpacing - 2);
    }

    // bounded iterative search for readability-preserving fit.
    let attempts = 0;
    setSettings((prev) => ({ ...prev, ...next }));
    const runSearch = () => {
      attempts += 1;
      if (attempts > 8) return;
      const node = resumeRef.current;
      if (!node) return;
      const overflow = node.scrollHeight - PAGE_HEIGHT_PX;
      if (overflow <= 0) return;

      setSettings((prev) => ({
        ...prev,
        paragraphSpacing: Math.max(prev.minParagraphSpacing, prev.paragraphSpacing - 1),
        lineHeight: Math.max(prev.minLineHeight, Number((prev.lineHeight - 0.02).toFixed(2))),
        bodyFontSize: Math.max(prev.minBodyFontSize, prev.bodyFontSize - (attempts % 2 === 0 ? 1 : 0)),
        sectionSpacing: Math.max(8, prev.sectionSpacing - 1),
      }));
      requestAnimationFrame(runSearch);
    };
    requestAnimationFrame(runSearch);
  };

  const handleExport = () => {
    if (!fitResult.fits && !allowPagination) {
      const shouldPaginate = window.confirm(
        `Current content requires approximately ${fitResult.pages} pages. Allow pagination (up to ${MAX_PAGES} pages)?`
      );
      if (!shouldPaginate) return;
      setAllowPagination(true);
    }
    window.print();
  };

  return (
    <div className="resume-builder-page">
      <div className="resume-builder-controls">
        <h1>Resume Builder</h1>
        <p>Create a one-page resume with fit checks, bounded auto-fit, and export controls.</p>

        <div className="grid-two">
          <label>
            Full Name
            <input value={data.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
          </label>
          <label>
            Email
            <input value={data.email} onChange={(e) => updateField('email', e.target.value)} />
          </label>
          <label>
            Phone
            <input value={data.phone} onChange={(e) => updateField('phone', e.target.value)} />
          </label>
          <label>
            Location
            <input value={data.location} onChange={(e) => updateField('location', e.target.value)} />
          </label>
        </div>

        <label>
          Professional Summary
          <textarea value={data.professionalSummary} onChange={(e) => updateField('professionalSummary', e.target.value)} rows={3} />
        </label>

        <div className="grid-two">
          <label>
            Certifications (one per line)
            <textarea value={data.certifications.join('\n')} onChange={(e) => updateListField('certifications', e.target.value)} rows={6} />
          </label>
          <label>
            Skills (one per line)
            <textarea value={data.skills.join('\n')} onChange={(e) => updateListField('skills', e.target.value)} rows={6} />
          </label>
          <label>
            Education (one per line)
            <textarea value={data.education.join('\n')} onChange={(e) => updateListField('education', e.target.value)} rows={6} />
          </label>
          <label>
            Work Experience (one per line)
            <textarea value={data.workExperience.join('\n')} onChange={(e) => updateListField('workExperience', e.target.value)} rows={6} />
          </label>
        </div>

        <label>
          Tools & Technology (one per line)
          <textarea value={data.toolsAndTechnology.join('\n')} onChange={(e) => updateListField('toolsAndTechnology', e.target.value)} rows={4} />
        </label>

        <h2>Auto-fit Settings</h2>
        <div className="grid-two settings-grid">
          <label>
            Font Family
            <select value={settings.fontFamily} onChange={(e) => updateSetting('fontFamily', e.target.value)}>
              {fontOptions.map((font) => (
                <option key={font.label} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Font Size {settings.bodyFontSize}px (min/max)
            <div className="inline-controls">
              <input type="number" value={settings.minBodyFontSize} onChange={(e) => updateSetting('minBodyFontSize', Number(e.target.value))} />
              <input type="number" value={settings.maxBodyFontSize} onChange={(e) => updateSetting('maxBodyFontSize', Number(e.target.value))} />
            </div>
          </label>

          <label>
            Line Height {settings.lineHeight}
            <div className="inline-controls">
              <input type="number" step="0.01" value={settings.minLineHeight} onChange={(e) => updateSetting('minLineHeight', Number(e.target.value))} />
              <input type="number" step="0.01" value={settings.maxLineHeight} onChange={(e) => updateSetting('maxLineHeight', Number(e.target.value))} />
            </div>
          </label>

          <label>
            Paragraph Spacing {settings.paragraphSpacing}px
            <div className="inline-controls">
              <input type="number" value={settings.minParagraphSpacing} onChange={(e) => updateSetting('minParagraphSpacing', Number(e.target.value))} />
              <input type="number" value={settings.maxParagraphSpacing} onChange={(e) => updateSetting('maxParagraphSpacing', Number(e.target.value))} />
            </div>
          </label>
        </div>

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

      <div className="resume-preview-shell">
        <div className={`resume-page ${allowPagination ? 'allow-pagination' : ''}`} ref={resumeRef} style={styles}>
          <header className="resume-header">
            <div className="logo-placeholder">LOGO</div>
            <h1>{data.fullName}</h1>
            <p>{data.email} · {data.phone} · {data.location}</p>
          </header>

          <section>
            <h3>Professional Summary</h3>
            <p>{data.professionalSummary}</p>
          </section>

          <section>
            <h3>Certifications</h3>
            <ul className="two-col-list">
              {data.certifications.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Skills</h3>
            <ul className="two-col-list">
              {data.skills.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Education</h3>
            <ul className={isDenseEducation ? 'two-col-list' : 'single-col-list'}>
              {data.education.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Work Experience</h3>
            <ul className={isDenseWorkExperience ? 'two-col-list' : 'single-col-list'}>
              {data.workExperience.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Tools & Technology</h3>
            <ul className="single-col-list">
              {data.toolsAndTechnology.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
