// student-evaluation-app/client/src/components/Quizzes/AptitudeTest.jsx
//
// Custom staged experience for the "Mechanical Aptitude Test" (a quiz whose
// `template === 'mechanical-aptitude'`). Unlike the generic flat quiz form,
// this drives the student through a sequence of phases:
//
//   1. Intro / overview
//   2. System 1 (HydroTronic Guardian): instructions -> 5:00 timed manual
//      study with an in-app 3x5 note card -> 3 scenario free-response questions
//      (manual hidden, notes stay pinned)
//   3. System 2 (AquaLogic FlowMaster): instructions -> 5:00 timed manual study
//      (NO notes) -> 3 scenario free-response questions (manual hidden)
//   4. Remaining questions: gear-train (with diagram) + mechanical reasoning
//      (multiple choice) + diagnostic short answer
//   5. Submit -> self-check results (auto-scored MC + sample answers; the free
//      response is graded later by an instructor)
//
// The questions live in the database (seeded by server/scripts/seedAptitudeTest.js)
// and are mapped into this flow by their stable `key` / `section`. Manuals and
// sample answers are rebuilt in-app here from the service-manual text. Progress
// (phase, answers, notes, timer end-times) is mirrored to localStorage so an
// accidental refresh resumes where the student left off without re-opening a
// manual whose time has passed.

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import URL from '../../backEndURL';

/* ─────────────────────────── Constants ─────────────────────────── */

const PHASES = {
  INTRO: 'intro',
  S1_INTRO: 's1_intro',
  S1_STUDY: 's1_study',
  S1_QUESTIONS: 's1_questions',
  S2_INTRO: 's2_intro',
  S2_STUDY: 's2_study',
  S2_QUESTIONS: 's2_questions',
  REMAINING: 'remaining',
  RESULTS: 'results',
};

const STUDY_SECONDS = 5 * 60; // 5 minutes per manual
const STUDY_MS = STUDY_SECONDS * 1000;

// The 3x5 note card holds a deliberately limited amount of text so the student
// must prioritize a concise quick-reference, like a real index card, instead of
// transcribing the whole manual.
const MAX_NOTE_CHARS = 500;

// Sample strong answers (from the service-manual answer key) shown to the
// student during self-check and to the instructor while grading. Exported so the
// grading page can reuse them. The instructor still grades the actual response.
export const SAMPLE_ANSWERS = {
  s1q1:
    'Yellow means hydraulic pressure has fallen below 30 psi. Move the master control lever to Standby because the system is outside the optimal pressure range and needs attention, even though it is not yet a critical red condition.',
  s1q2:
    'Red is a critical condition because pressure is above 99 psi and temperature is above 125 degrees F. Move the safety lever to Emergency Shut-Down immediately, then turn the pressure valve counter-clockwise until pressure is less than 65 psi. The valve adjustment is needed to reduce overpressure rather than only stopping operation.',
  s1q3:
    'Shift the master control lever to Standby. The temperature is safe, but pressure at 28 psi is below the 30 psi threshold, which triggers the yellow warning and requires attention.',
  s2q1:
    'Orange means flow is below 200 gpm. With pressure at 30 psi, pressure is in the 15 to 45 psi safe zone, so focus on correcting or investigating the low-flow condition rather than reducing pressure.',
  s2q2:
    'Critical impurity requires action even though temperature is normal. Identify the purity condition as the primary fault, stop or place the system in a safe condition, and correct the impurity issue before continuing operation.',
  s2q3:
    'Red flow at 550 gpm and 50 psi both exceed normal limits. Use the Emergency Release Valve to rapidly reduce pressure and flow rate, then adjust pressure counter-clockwise and restore flow to the 200 to 500 gpm range before normal operation.',
  s5q12:
    'The pump can make pressure when capped, so the likely fault is downstream leakage or bypass, such as a control valve bypass, cylinder internal leak, or a relief/bypass valve stuck open.',
  s5q13:
    'Most likely failed relay contacts or a poor relay power feed. The coil can click, but the load side is not delivering voltage.',
  s5q14:
    'Air leak at the fitting. Repair or replace the leaking fitting or line and retest before condemning the clamp.',
  s5q15:
    'Likely causes include misalignment, over-tightened belt or coupling, incorrect bearing preload, binding under load, lack of lubrication, or incorrect assembly clearances.',
};

const SECTION_TITLES = {
  system1: 'System 1: HydroTronic Guardian',
  system2: 'System 2: AquaLogic FlowMaster',
  system3: 'System 3: Gear Train Rotation and Direction',
  system4: 'System 4: Mechanical Reasoning',
  system5: 'System 5: Diagnostic Aptitude',
};

/* ─────────────────────────── Style helpers ─────────────────────────── */

const card = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '22px 24px',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

// Override the app-wide `button { max-width:150px; align-self:center; ... }` rule.
const btn = (bg, color = '#fff') => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '11px 20px',
  background: bg,
  color,
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
  maxWidth: 'none',
  margin: 0,
  alignSelf: 'auto',
  boxSizing: 'border-box',
});

const ghostBtn = {
  ...btn('#fff', '#334155'),
  border: '1px solid #cbd5e1',
};

/* ─────────────────────────── Gear-train diagram ─────────────────────────── */

/** One toothed gear (pitch circle + radial teeth + center label). */
const Gear = ({ cx, cy, r, label, fill = '#f1f5f9', highlight = false }) => {
  const teeth = 16;
  const inner = r;
  const outer = r + 7;
  const lines = [];
  for (let i = 0; i < teeth; i += 1) {
    const a = (i / teeth) * Math.PI * 2;
    lines.push(
      <line
        key={i}
        x1={cx + inner * Math.cos(a)}
        y1={cy + inner * Math.sin(a)}
        x2={cx + outer * Math.cos(a)}
        y2={cy + outer * Math.sin(a)}
        stroke="#475569"
        strokeWidth={3}
      />
    );
  }
  return (
    <g>
      {lines}
      <circle cx={cx} cy={cy} r={r} fill={highlight ? '#dbeafe' : fill} stroke="#475569" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={6} fill="#475569" />
      <text x={cx} y={cy - r - 11} textAnchor="middle" fontSize={15} fontWeight="700" fill="#0f172a">
        {label}
      </text>
    </g>
  );
};

Gear.propTypes = {
  cx: PropTypes.number.isRequired,
  cy: PropTypes.number.isRequired,
  r: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  fill: PropTypes.string,
  highlight: PropTypes.bool,
};

/**
 * Schematic gear train. Drive gear A (top-left) turns clockwise. The top row
 * A-B-C-D-E-F meshes left to right (F is a target). A vertical chain C-G-H drops
 * down to the bottom row H-I-J-K-L (L is a target). Every gear is an external
 * spur gear in mesh, so each mesh reverses direction.
 */
const GearTrainDiagram = () => {
  const r = 36;
  const topY = 70;
  const topX = [70, 152, 234, 316, 398, 480];
  const topLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
  return (
    <div style={{ overflowX: 'auto', textAlign: 'center', margin: '6px 0 14px' }}>
      <svg viewBox="0 0 560 360" style={{ width: '100%', maxWidth: 560, height: 'auto' }} role="img" aria-label="Gear train diagram">
        {/* Top row A-F */}
        {topX.map((x, i) => (
          <Gear key={topLabels[i]} cx={x} cy={topY} r={r} label={topLabels[i]} highlight={topLabels[i] === 'F'} />
        ))}
        {/* Vertical chain G, H under C */}
        <Gear cx={234} cy={158} r={30} label="G" />
        <Gear cx={234} cy={232} r={30} label="H" />
        {/* Bottom row I-L */}
        <Gear cx={234} cy={306} r={36} label="I" />
        <Gear cx={316} cy={306} r={36} label="J" />
        <Gear cx={398} cy={306} r={36} label="K" />
        <Gear cx={480} cy={306} r={36} label="L" highlight />

        {/* Drive arrow + label near A (clockwise) */}
        <path d="M 38 50 A 34 34 0 1 1 36 70" fill="none" stroke="#dc2626" strokeWidth={3} markerEnd="url(#arrow)" />
        <defs>
          <marker id="arrow" markerWidth="9" markerHeight="9" refX="5" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#dc2626" />
          </marker>
        </defs>
        <text x={70} y={132} textAnchor="middle" fontSize={12} fontWeight="700" fill="#dc2626">DRIVE, CW</text>

        {/* Target labels */}
        <text x={480} y={20} textAnchor="middle" fontSize={12} fontWeight="700" fill="#1d4ed8">TARGET</text>
        <text x={480} y={356} textAnchor="middle" fontSize={12} fontWeight="700" fill="#1d4ed8">TARGET</text>
      </svg>
      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
        Every gear is an external spur gear and all touching gears are in mesh (no slipping).
      </div>
    </div>
  );
};

/* ─────────────────────────── Manuals (rebuilt in-app) ─────────────────────────── */

const Pill = ({ color, text }) => (
  <span
    style={{
      display: 'inline-block',
      width: 12,
      height: 12,
      borderRadius: '50%',
      background: color,
      marginRight: 8,
      verticalAlign: 'middle',
      border: '1px solid rgba(0,0,0,0.2)',
    }}
    aria-hidden
  >
    {text}
  </span>
);
Pill.propTypes = { color: PropTypes.string.isRequired, text: PropTypes.string };

const manualBox = {
  background: '#f8fafc',
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  padding: '18px 20px',
  lineHeight: 1.5,
};

const HydroTronicManual = () => (
  <div style={manualBox}>
    <h3 style={{ marginTop: 0, color: '#0f172a' }}>Service Manual: HydroTronic Guardian System</h3>
    <p style={{ color: '#475569', marginTop: 0 }}>
      An electronic control panel for a mechanical and hydraulic system. Read the status lights and respond with the
      correct controls.
    </p>

    <h4 style={{ marginBottom: 6 }}>Status indicators</h4>
    <ul style={{ marginTop: 0 }}>
      <li><Pill color="#16a34a" /><strong>Green:</strong> hydraulic pressure is above 30 psi but below 99 psi, and temperature is below 125 degrees F. Normal, safe operation.</li>
      <li><Pill color="#eab308" /><strong>Yellow:</strong> low-pressure warning. Activates when hydraulic pressure falls below 30 psi. Precautionary, needs attention.</li>
      <li><Pill color="#dc2626" /><strong>Red:</strong> critical. Activates if pressure exceeds 99 psi or temperature rises above 125 degrees F (overpressure or overheating).</li>
    </ul>

    <h4 style={{ marginBottom: 6 }}>Required operator response</h4>
    <ul style={{ marginTop: 0 }}>
      <li><strong>Green:</strong> move the master control lever to the Run position (normal operations).</li>
      <li><strong>Yellow:</strong> shift the master control lever to the Standby position (needs attention, not immediate danger).</li>
      <li><strong>Red:</strong> move the safety lever to Emergency Shut-Down immediately, then turn the pressure valve counter-clockwise until the pressure gauge shows less than 65 psi.</li>
    </ul>

    <h4 style={{ marginBottom: 6 }}>Controls and gauges</h4>
    <ul style={{ marginTop: 0 }}>
      <li><strong>Master Control Lever:</strong> Run (up) / Standby (down).</li>
      <li><strong>Safety Lever:</strong> Emergency Shut-Down (right).</li>
      <li><strong>Pressure Valve:</strong> turn counter-clockwise to reduce pressure.</li>
      <li><strong>Gauges:</strong> Hydraulic Pressure (psi) and Temperature (degrees F), plus the green / yellow / red status lights.</li>
    </ul>
  </div>
);

const AquaLogicManual = () => (
  <div style={manualBox}>
    <h3 style={{ marginTop: 0, color: '#0f172a' }}>Service Manual: AquaLogic FlowMaster System</h3>
    <p style={{ color: '#475569', marginTop: 0 }}>
      A control panel for advanced aquatic and fluid management. Monitor flow, pressure, temperature, and purity, and
      respond to the colored indicators.
    </p>

    <h4 style={{ marginBottom: 6 }}>Indicators and controls</h4>
    <ul style={{ marginTop: 0 }}>
      <li>
        <strong>Flow Rate Indicator:</strong>{' '}
        <Pill color="#2563eb" /> blue = optimal (200 to 500 gpm),{' '}
        <Pill color="#f97316" /> orange = low (below 200 gpm),{' '}
        <Pill color="#dc2626" /> red = high (above 500 gpm).
      </li>
      <li><strong>Pressure Balance Dial:</strong> adjusts hydraulic pressure. Safe zone is 15 to 45 psi. Clockwise increases pressure, counter-clockwise decreases it.</li>
      <li><strong>Temperature Sensor Display:</strong> normal operating range is 65 to 85 degrees F.</li>
      <li>
        <strong>Purity Level Gauge:</strong>{' '}
        <Pill color="#16a34a" /> green = optimal purity,{' '}
        <Pill color="#eab308" /> yellow = caution,{' '}
        <Pill color="#dc2626" /> red = critical impurity.
      </li>
      <li><strong>Emergency Release Valve:</strong> rapidly decreases pressure and flow rate to prevent system overload.</li>
    </ul>
  </div>
);

/* ─────────────────────────── Question renderers ─────────────────────────── */

const McQuestion = ({ question, value, onChange, flagged }) => (
  <div
    id={`apt-q-${question._id}`}
    style={{
      padding: 16,
      marginBottom: 14,
      border: flagged ? '2px solid #dc2626' : '1px solid #e2e8f0',
      background: flagged ? '#fef2f2' : '#fff',
      borderRadius: 10,
      scrollMarginTop: 80,
    }}
  >
    <p style={{ fontWeight: 700, marginTop: 0, marginBottom: 12 }}>
      {question.questionText}
      {flagged && <span style={{ color: '#dc2626', marginLeft: 8, fontSize: '0.85rem' }}>Needs an answer</span>}
    </p>
    {(question.options || []).map((opt, idx) => {
      const chosen = value === opt;
      return (
        <div
          key={idx}
          onClick={() => onChange(opt)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px',
            marginBottom: 8,
            cursor: 'pointer',
            border: chosen ? '2px solid #2563eb' : '1px solid #cbd5e1',
            borderRadius: 8,
            background: chosen ? '#eff6ff' : '#fff',
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2px solid #2563eb',
              marginRight: 10,
              background: chosen ? '#2563eb' : '#fff',
              flexShrink: 0,
            }}
          />
          <span>{opt}</span>
        </div>
      );
    })}
  </div>
);

McQuestion.propTypes = {
  question: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  flagged: PropTypes.bool,
};

const OpenQuestion = ({ question, value, onChange, flagged }) => (
  <div
    id={`apt-q-${question._id}`}
    style={{
      padding: 16,
      marginBottom: 14,
      border: flagged ? '2px solid #dc2626' : '1px solid #e2e8f0',
      background: flagged ? '#fef2f2' : '#fff',
      borderRadius: 10,
      scrollMarginTop: 80,
    }}
  >
    <p style={{ fontWeight: 700, marginTop: 0, marginBottom: 10 }}>
      {question.questionText}
      {flagged && <span style={{ color: '#dc2626', marginLeft: 8, fontSize: '0.85rem' }}>Needs an answer</span>}
    </p>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={5}
      placeholder="Type your answer here..."
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: 12,
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        fontSize: '0.95rem',
        fontFamily: 'inherit',
        resize: 'vertical',
      }}
    />
    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
      Free response. An instructor reviews and grades this answer.
    </div>
  </div>
);

OpenQuestion.propTypes = {
  question: PropTypes.object.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  flagged: PropTypes.bool,
};

/* ─────────────────────────── 3x5 note card ─────────────────────────── */

const NoteCard = ({ notes, onChange, readOnly }) => {
  const remaining = MAX_NOTE_CHARS - notes.length;
  const low = remaining <= 60;
  return (
    <div
      style={{
        // Fixed, index-card proportions (about 3 by 5). The text area cannot
        // grow, so the student is forced to keep notes brief.
        width: 360,
        maxWidth: '100%',
        background: '#fffdf5',
        border: '1px solid #e7d9a8',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: 12,
      }}
    >
      <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', color: '#92400e', textTransform: 'uppercase', marginBottom: 4 }}>
        Your 3x5 note card (limited space)
      </div>
      <div style={{ fontSize: '0.75rem', color: '#78716c', marginBottom: 6, lineHeight: 1.35 }}>
        Like a real index card, space is limited. Record only the key limits and required actions, briefly, to build a
        quick reference. You will not be able to fit the whole manual.
      </div>
      <textarea
        value={notes}
        // maxLength stops over-long pastes; the slice is a belt-and-suspenders guard.
        maxLength={MAX_NOTE_CHARS}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_NOTE_CHARS))}
        readOnly={readOnly}
        placeholder="e.g. Yellow = pressure < 30 psi -> lever to Standby..."
        style={{
          width: '100%',
          height: 168, // fixed: the card does not expand to fit pasted content
          boxSizing: 'border-box',
          border: '1px solid #e7d9a8',
          borderRadius: 4,
          background: 'repeating-linear-gradient(#fffdf5, #fffdf5 27px, #d7c98f 28px)',
          lineHeight: '28px',
          padding: '0 6px',
          fontFamily: 'Georgia, serif',
          fontSize: '0.92rem',
          color: '#1f2937',
          resize: 'none', // cannot be dragged larger
          overflow: 'auto',
          outline: 'none',
        }}
      />
      <div style={{ textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, marginTop: 4, color: low ? '#b91c1c' : '#92400e' }}>
        {remaining} character{remaining === 1 ? '' : 's'} left
      </div>
    </div>
  );
};

NoteCard.propTypes = {
  notes: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
};

/* ─────────────────────────── Countdown banner ─────────────────────────── */

const formatClock = (secs) => {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const TimerBar = ({ secondsLeft }) => {
  const low = secondsLeft <= 60;
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        background: low ? '#fef2f2' : '#ecfeff',
        border: `1px solid ${low ? '#fca5a5' : '#a5f3fc'}`,
        color: low ? '#b91c1c' : '#0e7490',
        padding: '10px 14px',
        borderRadius: 8,
        fontWeight: 800,
        marginBottom: 14,
      }}
      role="timer"
      aria-live="off"
    >
      Manual time remaining: {formatClock(secondsLeft)}
      {low && <span style={{ fontWeight: 600 }}>(the manual is about to be removed)</span>}
    </div>
  );
};

TimerBar.propTypes = { secondsLeft: PropTypes.number.isRequired };

/* ─────────────────────────── Main component ─────────────────────────── */

const AptitudeTest = ({ quiz, user, onBack, onSubmitted }) => {
  const storageKey = `aptitude:${quiz?._id}:${user?._id}`;

  // Restore any saved progress for this attempt.
  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null') || {};
    } catch {
      return {};
    }
  }, [storageKey]);

  const [phase, setPhase] = useState(saved.phase || PHASES.INTRO);
  const [answers, setAnswers] = useState(saved.answers || {});
  const [notes, setNotes] = useState(saved.notes || '');
  const [studyEnds, setStudyEnds] = useState(saved.studyEnds || {});
  const [now, setNow] = useState(() => Date.now());
  const [highlight, setHighlight] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { score, needsGrading }
  const topRef = useRef(null);

  // Group questions by section, preserving the seeded order.
  const bySection = useMemo(() => {
    const m = {};
    (quiz?.questions || []).forEach((q) => {
      const s = q.section || 'other';
      (m[s] = m[s] || []).push(q);
    });
    return m;
  }, [quiz]);

  /* Persist progress (except once we reach results, which clears storage). */
  useEffect(() => {
    if (phase === PHASES.RESULTS) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ phase, answers, notes, studyEnds }));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [storageKey, phase, answers, notes, studyEnds]);

  /* Tick while a manual is being studied. */
  const inStudy = phase === PHASES.S1_STUDY || phase === PHASES.S2_STUDY;
  useEffect(() => {
    if (!inStudy) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [inStudy]);

  /* Auto-advance when a study timer expires. */
  useEffect(() => {
    if (phase === PHASES.S1_STUDY && studyEnds.system1 && now >= studyEnds.system1) {
      setPhase(PHASES.S1_QUESTIONS);
    } else if (phase === PHASES.S2_STUDY && studyEnds.system2 && now >= studyEnds.system2) {
      setPhase(PHASES.S2_QUESTIONS);
    }
  }, [now, phase, studyEnds]);

  /* Scroll to top on every phase change. */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setHighlight(false);
    setMessage('');
  }, [phase]);

  const setAnswer = useCallback((qid, val) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  }, []);

  const startStudy = (sysKey, studyPhase) => {
    setStudyEnds((prev) => (prev[sysKey] ? prev : { ...prev, [sysKey]: Date.now() + STUDY_MS }));
    setNow(Date.now());
    setPhase(studyPhase);
  };

  const secondsLeft = (sysKey) => {
    const end = studyEnds[sysKey];
    return end ? Math.max(0, Math.round((end - now) / 1000)) : STUDY_SECONDS;
  };

  // Questions still missing an answer (trimmed) within a list.
  const unanswered = (questions) =>
    questions.filter((q) => {
      const v = answers[q._id];
      return v === undefined || String(v).trim() === '';
    });

  // Try to advance past a question phase; block + flag if anything is blank.
  const advanceIfComplete = (questions, nextPhase) => {
    const missing = unanswered(questions);
    if (missing.length > 0) {
      setHighlight(true);
      setMessage(
        `${missing.length} question${missing.length === 1 ? '' : 's'} still need an answer. You cannot return to this section, so answer all of them before continuing.`
      );
      const el = document.getElementById(`apt-q-${missing[0]._id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPhase(nextPhase);
  };

  const handleSubmit = async () => {
    const remaining = [
      ...(bySection.system3 || []),
      ...(bySection.system4 || []),
      ...(bySection.system5 || []),
    ];
    const missing = unanswered(remaining);
    if (missing.length > 0) {
      setHighlight(true);
      setMessage(
        `${missing.length} question${missing.length === 1 ? '' : 's'} still need an answer before you can submit.`
      );
      const el = document.getElementById(`apt-q-${missing[0]._id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${URL}/api/quizzes/${quiz._id}/submit`,
        { answers, studentId: user._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      setResult({ score: data.score, needsGrading: data.needsGrading });
      setPhase(PHASES.RESULTS);
      if (typeof onSubmitted === 'function') onSubmitted(data.score);
    } catch (err) {
      setMessage(`Error submitting test: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Shared little bits ── */
  const messageBanner = message ? (
    <div
      role="status"
      style={{
        background: '#fff7ed',
        border: '1px solid #fdba74',
        color: '#9a3412',
        padding: '10px 14px',
        borderRadius: 8,
        marginBottom: 14,
        fontWeight: 600,
      }}
    >
      {message}
    </div>
  ) : null;

  const stepHeader = (label) => (
    <div style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
      {label}
    </div>
  );

  /* ─────────────── Phase renderers ─────────────── */

  const renderIntro = () => (
    <div style={card}>
      <h2 style={{ marginTop: 0 }}>{quiz.title}</h2>
      <p>This aptitude test has five parts. Read carefully, you cannot move backward once you continue.</p>
      <ol style={{ lineHeight: 1.6 }}>
        <li><strong>System 1 (HydroTronic Guardian):</strong> 5 minutes to study the service manual while taking notes on a 3x5 card, then 3 scenario questions. Your notes stay with you, but the manual is removed.</li>
        <li><strong>System 2 (AquaLogic FlowMaster):</strong> 5 minutes to study the service manual with no notes allowed, then 3 scenario questions from memory.</li>
        <li><strong>System 3:</strong> gear-train rotation (multiple choice, with a diagram).</li>
        <li><strong>System 4:</strong> mechanical reasoning (multiple choice).</li>
        <li><strong>System 5:</strong> diagnostic short answer.</li>
      </ol>
      <p style={{ color: '#475569' }}>
        Multiple-choice answers are scored automatically. The written scenario and short answers are reviewed and graded
        by your instructor.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" style={btn('#2563eb')} onClick={() => setPhase(PHASES.S1_INTRO)}>
          Begin test
        </button>
        <button type="button" style={ghostBtn} onClick={onBack}>
          Back to quizzes
        </button>
      </div>
    </div>
  );

  const renderS1Intro = () => (
    <div style={card}>
      {stepHeader('Part 1 of 5')}
      <h2 style={{ marginTop: 0 }}>{SECTION_TITLES.system1}</h2>
      <p>When you click start, a <strong>5 minute</strong> timer begins and the service manual appears.</p>
      <ul style={{ lineHeight: 1.6 }}>
        <li>
          You may take notes on the on-screen 3x5 note card, but space is limited (about {MAX_NOTE_CHARS} characters,
          like a real index card). Record only what is important, briefly, so you build an efficient quick reference. The
          card stays visible after the manual is removed.
        </li>
        <li>Click <strong>Proceed to questions</strong> at any time, or wait for the timer. Either way the manual is then removed.</li>
        <li>You will answer 3 scenario questions using only your notes.</li>
      </ul>
      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" style={btn('#16a34a')} onClick={() => startStudy('system1', PHASES.S1_STUDY)}>
          Start 5:00 timer and open manual
        </button>
      </div>
    </div>
  );

  const renderS1Study = () => (
    <div>
      <TimerBar secondsLeft={secondsLeft('system1')} />
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 440px', minWidth: 300 }}>
          <HydroTronicManual />
        </div>
        <div style={{ flex: '0 0 auto', position: 'sticky', top: 64 }}>
          <NoteCard notes={notes} onChange={setNotes} />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <button type="button" style={btn('#2563eb')} onClick={() => setPhase(PHASES.S1_QUESTIONS)}>
          Proceed to questions (removes the manual)
        </button>
      </div>
    </div>
  );

  const renderS1Questions = () => {
    const qs = bySection.system1 || [];
    return (
      <div>
        {stepHeader('Part 1 of 5')}
        <h2 style={{ marginTop: 0 }}>{SECTION_TITLES.system1}: Scenarios</h2>
        <p style={{ color: '#475569' }}>The manual has been removed. Use your notes to answer.</p>
        {messageBanner}
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 440px', minWidth: 300 }}>
            {qs.map((q) => (
              <OpenQuestion
                key={q._id}
                question={q}
                value={answers[q._id]}
                onChange={(v) => setAnswer(q._id, v)}
                flagged={highlight && (!answers[q._id] || !answers[q._id].trim())}
              />
            ))}
          </div>
          <div style={{ flex: '0 0 auto', position: 'sticky', top: 16 }}>
            <NoteCard notes={notes} onChange={setNotes} />
          </div>
        </div>
        <button type="button" style={btn('#2563eb')} onClick={() => advanceIfComplete(qs, PHASES.S2_INTRO)}>
          Continue to System 2
        </button>
      </div>
    );
  };

  const renderS2Intro = () => (
    <div style={card}>
      {stepHeader('Part 2 of 5')}
      <h2 style={{ marginTop: 0 }}>{SECTION_TITLES.system2}</h2>
      <p>When you click start, a <strong>5 minute</strong> timer begins and the service manual appears.</p>
      <ul style={{ lineHeight: 1.6 }}>
        <li><strong>No notes are allowed</strong> for this system. You will answer from memory.</li>
        <li>You may end early with <strong>Continue</strong>, but once you leave you cannot return to the manual.</li>
        <li>You will answer 3 scenario questions after the manual is removed.</li>
      </ul>
      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <button type="button" style={btn('#16a34a')} onClick={() => startStudy('system2', PHASES.S2_STUDY)}>
          Start 5:00 timer and open manual
        </button>
      </div>
    </div>
  );

  const renderS2Study = () => {
    const left = secondsLeft('system2');
    const leaveNow = () => {
      if (left > 0) {
        const ok = window.confirm(
          'You still have time left. If you continue now you will NOT be able to return to the manual. Continue?'
        );
        if (!ok) return;
      }
      setPhase(PHASES.S2_QUESTIONS);
    };
    return (
      <div>
        <TimerBar secondsLeft={left} />
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#92400e',
            padding: '8px 12px',
            borderRadius: 8,
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          No notes for this system. Study carefully, you answer from memory.
        </div>
        <AquaLogicManual />
        <div style={{ marginTop: 16 }}>
          <button type="button" style={btn('#2563eb')} onClick={leaveNow}>
            Continue (you cannot return to the manual)
          </button>
        </div>
      </div>
    );
  };

  const renderS2Questions = () => {
    const qs = bySection.system2 || [];
    return (
      <div>
        {stepHeader('Part 2 of 5')}
        <h2 style={{ marginTop: 0 }}>{SECTION_TITLES.system2}: Scenarios</h2>
        <p style={{ color: '#475569' }}>The manual has been removed. Answer from memory.</p>
        {messageBanner}
        {qs.map((q) => (
          <OpenQuestion
            key={q._id}
            question={q}
            value={answers[q._id]}
            onChange={(v) => setAnswer(q._id, v)}
            flagged={highlight && (!answers[q._id] || !answers[q._id].trim())}
          />
        ))}
        <button type="button" style={btn('#2563eb')} onClick={() => advanceIfComplete(qs, PHASES.REMAINING)}>
          Continue to the remaining questions
        </button>
      </div>
    );
  };

  const renderRemaining = () => {
    const s3 = bySection.system3 || [];
    const s4 = bySection.system4 || [];
    const s5 = bySection.system5 || [];
    const flag = (q) => highlight && (!answers[q._id] || !answers[q._id].trim());
    return (
      <div>
        {stepHeader('Parts 3 to 5 of 5')}
        <h2 style={{ marginTop: 0 }}>Remaining Questions</h2>
        <p style={{ color: '#475569' }}>No manuals or timers here. Answer using basic mechanical principles.</p>
        {messageBanner}

        <h3>{SECTION_TITLES.system3}</h3>
        <GearTrainDiagram />
        {s3.map((q) => (
          <McQuestion key={q._id} question={q} value={answers[q._id]} onChange={(v) => setAnswer(q._id, v)} flagged={flag(q)} />
        ))}

        <h3 style={{ marginTop: 24 }}>{SECTION_TITLES.system4}</h3>
        {s4.map((q) => (
          <McQuestion key={q._id} question={q} value={answers[q._id]} onChange={(v) => setAnswer(q._id, v)} flagged={flag(q)} />
        ))}

        <h3 style={{ marginTop: 24 }}>{SECTION_TITLES.system5}</h3>
        {s5.map((q) => (
          <OpenQuestion key={q._id} question={q} value={answers[q._id]} onChange={(v) => setAnswer(q._id, v)} flagged={flag(q)} />
        ))}

        <button
          type="button"
          style={{ ...btn(isSubmitting ? '#94a3b8' : '#16a34a'), cursor: isSubmitting ? 'wait' : 'pointer' }}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit test'}
        </button>
      </div>
    );
  };

  const renderResults = () => {
    const all = [
      ...(bySection.system1 || []),
      ...(bySection.system2 || []),
      ...(bySection.system3 || []),
      ...(bySection.system4 || []),
      ...(bySection.system5 || []),
    ];
    const mc = all.filter((q) => q.questionType === 'multiple-choice');
    const mcCorrect = mc.filter((q) => {
      const v = (answers[q._id] || '').trim();
      return v && v === (q.correctAnswer || '').trim();
    }).length;
    const score = result ? result.score : 0;

    return (
      <div>
        <div
          style={{
            ...card,
            borderTop: '6px solid #2563eb',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2563eb' }}>
            Test submitted
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', margin: '6px 0 2px' }}>
            {Number(score).toFixed(1)}%
          </div>
          <p style={{ color: '#475569', margin: '0 0 6px' }}>
            Multiple choice scored automatically: {mcCorrect} of {mc.length} correct.
          </p>
          {result?.needsGrading && (
            <p style={{ color: '#92400e', fontWeight: 600, margin: 0 }}>
              Your written responses are awaiting instructor grading. This percentage reflects the multiple-choice
              portion only and will update once grading is complete.
            </p>
          )}
        </div>

        <h3 style={{ marginTop: 24 }}>Review and self-check</h3>
        {all.map((q) => {
          const v = (answers[q._id] || '').trim();
          if (q.questionType === 'multiple-choice') {
            const correct = (q.correctAnswer || '').trim();
            const right = v && v === correct;
            return (
              <div key={q._id} style={{ ...card, marginBottom: 12, borderLeft: `5px solid ${right ? '#16a34a' : '#dc2626'}` }}>
                <p style={{ fontWeight: 700, marginTop: 0 }}>{q.questionText}</p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Your answer:</strong> {v || '(no answer)'}{' '}
                  <span style={{ color: right ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{right ? 'Correct' : 'Incorrect'}</span>
                </p>
                {!right && (
                  <p style={{ margin: '4px 0', color: '#16a34a' }}>
                    <strong>Correct answer:</strong> {correct}
                  </p>
                )}
              </div>
            );
          }
          return (
            <div key={q._id} style={{ ...card, marginBottom: 12, borderLeft: '5px solid #2563eb' }}>
              <p style={{ fontWeight: 700, marginTop: 0 }}>{q.questionText}</p>
              <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>
                <strong>Your answer:</strong> {v || '(no answer)'}
              </p>
              {SAMPLE_ANSWERS[q.key] && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 12px', marginTop: 6 }}>
                  <strong style={{ color: '#0369a1' }}>Sample strong answer:</strong>
                  <div style={{ color: '#0c4a6e', marginTop: 4 }}>{SAMPLE_ANSWERS[q.key]}</div>
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 6 }}>Scored by your instructor.</div>
            </div>
          );
        })}

        <button type="button" style={btn('#2563eb')} onClick={onBack}>
          Back to quizzes
        </button>
      </div>
    );
  };

  /* ─────────────── Phase switch ─────────────── */
  let body;
  switch (phase) {
    case PHASES.S1_INTRO: body = renderS1Intro(); break;
    case PHASES.S1_STUDY: body = renderS1Study(); break;
    case PHASES.S1_QUESTIONS: body = renderS1Questions(); break;
    case PHASES.S2_INTRO: body = renderS2Intro(); break;
    case PHASES.S2_STUDY: body = renderS2Study(); break;
    case PHASES.S2_QUESTIONS: body = renderS2Questions(); break;
    case PHASES.REMAINING: body = renderRemaining(); break;
    case PHASES.RESULTS: body = renderResults(); break;
    case PHASES.INTRO:
    default: body = renderIntro(); break;
  }

  return (
    <div ref={topRef}>
      {body}
    </div>
  );
};

AptitudeTest.propTypes = {
  quiz: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string,
    questions: PropTypes.array,
  }).isRequired,
  user: PropTypes.shape({ _id: PropTypes.string.isRequired }).isRequired,
  onBack: PropTypes.func.isRequired,
  onSubmitted: PropTypes.func,
};

export default AptitudeTest;
