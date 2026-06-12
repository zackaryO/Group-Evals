// Path: student-evaluation-app/client/src/components/Quizzes/TakeQuiz.js
// File:  TakeQuiz.js
// Purpose:
// ─────────
// A polished, fully‑documented React component that lets a student:
//
//   1. Fetch and display all **published** quizzes.
//   2. Guard against multiple attempts when `allowMultipleSubmissions === false`.
//   3. Render the chosen quiz with optional question images.
//   4. Track answers in‑memory and submit them for grading.
//   5. Show the graded score (rounded to one decimal place) and a link to the gradebook.
//
// Additional quality‑of‑life improvements:
//   • Robust error handling with user‑friendly feedback.
//   • Cleanup on unmount to prevent state‑updates‑after‑unmount warnings.
//   • Disabled “Submit” button until every question is answered.
//   • Modular, memo‑friendly inline styles stored outside the component.
//   • PropTypes runtime validation (keep file in JavaScript as requested).
//   • FontAwesome integration for the grade‑book link icon.
//
// NOTE: If using **TypeScript** elsewhere, rename to `.tsx` and replace PropTypes
//       with proper interface definitions. No other code changes are required.

/* ────────────────────────────────────────────────────────────────────────── */
/* Dependencies                                                             */
/* ────────────────────────────────────────────────────────────────────────── */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faChevronDown } from '@fortawesome/free-solid-svg-icons';

import URL from '../../backEndURL';

/** Passing threshold (percent). At or above this counts as a pass. */
const PASS_THRESHOLD = 80;

/**
 * Derive a quiz's display status from the student's prior submission.
 * @param {Object|undefined} submission The student's submission for this quiz.
 * @returns {'not-taken'|'passed'|'needs-work'}
 */
function quizStatus(submission) {
  if (!submission) return 'not-taken';
  return (submission.score ?? 0) >= PASS_THRESHOLD ? 'passed' : 'needs-work';
}

/** Format a due date as a short, friendly string (or null when absent). */
function formatDueDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Decode a JWT's payload without verifying the signature (we only care about
 * the `exp` claim for the session-expiry banner — the server is the source
 * of truth for actual auth). Returns `null` on any parse error.
 */
function decodeJwtExp(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Reusable inline‑style objects                                            */
/* ────────────────────────────────────────────────────────────────────────── */
const containerStyle = {
  maxWidth: '800px',
  margin: 'auto',
  padding: '20px',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
};

const primaryButtonStyle = {
  padding: '10px 20px',
  backgroundColor: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

/* ────────────────────────────────────────────────────────────────────────── */
/**
 * <ScoreCard /> – the post-submission result panel.
 * -------------------------------------------------
 * Colored by pass/fail (≥80% green, otherwise red) with high-contrast text,
 * a link to review missed questions, and a link back to the quiz list.
 *
 * @param {number}   score  Raw score, e.g. 92.666
 * @param {Function} onBack Returns the student to the quiz-selection view.
 */
const ScoreCard = ({ score, onBack }) => {
  const safeScore = Number.isFinite(score) ? score : 0;
  const passed = safeScore >= 80;
  const accent = passed ? '#16a34a' : '#dc2626';
  const tint = passed ? '#f0fdf4' : '#fef2f2';

  // Explicit overrides so the app-wide `button { max-width:150px; background;
  // color:white }` rule can't bleed into these controls.
  const linkBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '0.92rem',
    textDecoration: 'none',
    cursor: 'pointer',
    maxWidth: 'none',
    margin: 0,
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        marginTop: 20,
        padding: '26px 20px',
        background: tint,
        border: `1px solid ${accent}40`,
        borderTop: `6px solid ${accent}`,
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: accent }}>
        {passed ? '✓ Passed' : '✕ Below Passing'}
      </div>
      <div style={{ fontSize: '2.8rem', fontWeight: 800, color: accent, lineHeight: 1.1, margin: '6px 0 2px' }}>
        {safeScore.toFixed(1)}%
      </div>
      <p style={{ color: '#475569', margin: '0 0 20px', fontSize: '0.95rem' }}>
        {passed
          ? 'Great work — you passed this quiz.'
          : 'You scored below the 80% passing mark. Review the questions you missed, then try again.'}
      </p>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/quiz-gradebook" style={{ ...linkBtn, background: accent, color: '#fff', border: `1px solid ${accent}` }}>
          <FontAwesomeIcon icon={faBook} /> See Missed Questions
        </Link>
        <button
          type="button"
          onClick={onBack}
          style={{ ...linkBtn, background: '#fff', color: '#334155', border: '1px solid #cbd5e1' }}
        >
          ← Back to quizzes
        </button>
      </div>
    </div>
  );
};

ScoreCard.propTypes = {
  score: PropTypes.number.isRequired,
  onBack: PropTypes.func.isRequired,
};

/* ────────────────────────────────────────────────────────────────────────── */
/**
 * <ScrollChevron /> – a bouncing down-chevron hinting at off-screen content.
 * -------------------------------------------------------------------------
 * Fixed to the bottom-center of the viewport, it appears only while the page
 * is scrollable and the student isn't already at the bottom. Clicking it
 * scrolls the next screenful into view. A ResizeObserver keeps it in sync as
 * cards load / the view changes.
 */
const ScrollChevron = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const atBottom = window.scrollY >= scrollable - 48;
      setVisible(scrollable > 80 && !atBottom);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    if (ro) ro.observe(document.body);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      if (ro) ro.disconnect();
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      <style>{`@keyframes tq-bounce {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50%      { transform: translateX(-50%) translateY(9px); }
      }`}</style>
      <button
        type="button"
        aria-label="Scroll down for more quizzes"
        onClick={() => window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior: 'smooth' })}
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 18,
          transform: 'translateX(-50%)',
          animation: 'tq-bounce 1.4s ease-in-out infinite',
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          margin: 0,
          maxWidth: 'none',
          background: 'rgba(15, 23, 42, 0.82)',
          color: '#fff',
          fontSize: '1.1rem',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesomeIcon icon={faChevronDown} />
      </button>
    </>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Status → color palette. Kept as inline-style values (not a CSS class) so   */
/* the colors render regardless of global button styling / stylesheet load.   */
const STATUS_PALETTE = {
  // not-taken uses an attention-grabbing amber (not a calm blue) and a
  // persistent tinted fill so "still to do" quizzes visibly stand out from
  // the completed ones. needs-work is red to flag a below-passing score.
  'not-taken':  { accent: '#ea580c', tint: '#fff7ed', pill: 'NOT COMPLETED', label: 'To Do' },
  passed:       { accent: '#16a34a', tint: '#f0fdf4', pill: 'PASSED', label: 'Passed' },
  'needs-work': { accent: '#dc2626', tint: '#fef2f2', pill: 'BELOW 80%', label: 'Needs Work' },
};

/**
 * <QuizCard /> – a single selectable quiz, color-coded by status.
 * ---------------------------------------------------------------
 * • not-taken  → blue   left border + "!" badge
 * • passed     → green  left border + ✓ score badge
 * • needs-work → amber  left border + score badge
 *
 * Renders as a real <button> so it's keyboard-accessible and focusable.
 * Styling is inline (matching this file's convention) so it can't be clobbered
 * by app-wide button rules. Locked single-attempt quizzes are dimmed.
 */
const QuizCard = ({ quiz, submission, status, disabled, onSelect }) => {
  const [hover, setHover] = useState(false);
  const { accent, tint, pill } = STATUS_PALETTE[status];
  const isNotTaken = status === 'not-taken';

  const questionCount = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
  const due = formatDueDate(quiz.dueDate);
  const isOverdue =
    quiz.dueDate && status === 'not-taken' && new Date(quiz.dueDate).getTime() < Date.now();

  const locked = !quiz.allowMultipleSubmissions && !!submission;
  const retakeable = quiz.allowMultipleSubmissions && !!submission;

  const score = submission ? Number(submission.score) : null;
  const scoreLabel = Number.isFinite(score) ? `${score.toFixed(0)}%` : null;

  const cardStyleInline = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '14px 16px',
    // Not-taken quizzes keep a persistent tinted fill so they jump out from
    // the white "done" cards; others tint only on hover.
    background: isNotTaken || (hover && !locked) ? tint : '#fff',
    border: isNotTaken ? `1px solid ${accent}55` : '1px solid #e2e8f0',
    borderLeft: `6px solid ${accent}`,
    borderRadius: 10,
    boxShadow: hover && !locked ? '0 6px 16px rgba(0,0,0,0.12)' : '0 1px 2px rgba(0,0,0,0.05)',
    transform: hover && !locked ? 'translateY(-2px)' : 'none',
    transition: 'transform .12s ease, box-shadow .12s ease, background .12s ease',
    cursor: locked ? 'not-allowed' : 'pointer',
    textAlign: 'left',
    width: '100%',
    // The app has a global `button { max-width:150px; align-self:center;
    // margin-top:20px }` rule (RegisterUser.css / DefineAreas.css). Those are
    // separate properties from `width`, so we must reset each one explicitly
    // or the cards get capped at 150px and won't stretch to equal heights.
    maxWidth: 'none',
    alignSelf: 'stretch',
    margin: 0,
    boxSizing: 'border-box',
    font: 'inherit',
    color: '#1e293b',
    opacity: locked ? 0.7 : 1,
  };

  // Status pill (top-right): explicit text, not just a colored dot, so the
  // state is unambiguous. Score is appended for graded quizzes.
  const pillText =
    isNotTaken ? pill
      : `${pill === 'PASSED' ? '✓ PASSED' : `✕ ${pill}`}${scoreLabel ? ` · ${scoreLabel}` : ''}`;

  // The clear, plain-language status line shown in the card body.
  const statusLine =
    isNotTaken ? "You haven't taken this quiz yet"
      : status === 'passed' ? `Passed — you scored ${scoreLabel}`
      : `Scored ${scoreLabel} — below the 80% passing mark`;

  // Bottom call-to-action.
  const action =
    isNotTaken ? 'Start quiz →'
      : locked ? 'Completed — single attempt'
      : retakeable ? 'Retake quiz →'
      : 'Review answers →';

  const pillStyle = {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 9px',
    borderRadius: 999,
    fontSize: '0.7rem',
    fontWeight: 800,
    letterSpacing: '0.03em',
    lineHeight: 1,
    color: '#fff',
    background: accent,
    whiteSpace: 'nowrap',
  };

  return (
    <button
      type="button"
      style={cardStyleInline}
      onClick={() => !disabled && onSelect(quiz)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      disabled={disabled}
      aria-label={`${quiz.title} — ${statusLine}`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: '1.02rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
          {quiz.title}
        </span>
        <span style={pillStyle}>{pillText}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', fontSize: '0.82rem', color: '#64748b' }}>
        <span>{questionCount} question{questionCount === 1 ? '' : 's'}</span>
        {due && (
          <>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={isOverdue ? { color: '#dc2626', fontWeight: 600 } : undefined}>
              {isOverdue ? 'Overdue ' : 'Due '}{due}
            </span>
          </>
        )}
      </div>

      {/* Plain-language status so the student knows exactly what to do. */}
      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: accent }}>{statusLine}</div>

      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: accent, marginTop: 2 }}>{action}</div>
    </button>
  );
};

QuizCard.propTypes = {
  quiz: PropTypes.object.isRequired,
  submission: PropTypes.object,
  status: PropTypes.oneOf(['not-taken', 'passed', 'needs-work']).isRequired,
  disabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
};

/* ────────────────────────────────────────────────────────────────────────── */
/**
 * TakeQuiz Component
 * ==================
 * Allows a student to pick a published quiz, answer each question, and submit
 * it for grading. Previous submissions are checked to enforce single‑attempt
 * policies. A score is shown immediately after grading.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.user The logged‑in user object (must contain `_id`).
 */
const TakeQuiz = ({ user }) => {
  /* ──────────────── Local State ──────────────── */
  const [quizzes, setQuizzes]                   = useState([]);           // All published quizzes
  const [selectedQuiz, setSelectedQuiz]         = useState(null);         // Quiz being taken
  const [answers, setAnswers]                   = useState({});           // { [questionId]: option }
  const [score, setScore]                       = useState(null);         // Numeric grade
  const [message, setMessage]                   = useState('');           // Success / error feedback
  const [isLoading, setIsLoading]               = useState(false);        // Fetch / submit activity
  const [previousSubmissions, setPreviousSubs]  = useState({});           // { [quizId]: submission }
  const [highlightUnanswered, setHighlightUnanswered] = useState(false);  // Flag unanswered questions after a blocked submit

  // Tick once per second so the session-expiry banner can update its
  // countdown. We only mount the timer while the student is actively
  // taking a quiz (selectedQuiz set, score not yet posted).
  const isTakingQuiz = !!selectedQuiz && score === null;
  const tokenExpMs = useMemo(() => decodeJwtExp(localStorage.getItem('token')), []);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isTakingQuiz || !tokenExpMs) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isTakingQuiz, tokenExpMs]);
  const msLeft = tokenExpMs ? tokenExpMs - now : null;
  const showExpiryWarning = isTakingQuiz && msLeft !== null && msLeft <= 10 * 60 * 1000;

  /* ──────────────── Fetch Quizzes & Submissions ──────────────── */
  useEffect(() => {
    if (!user?._id) return;

    const controller = new AbortController(); // so we can abort on unmount

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const config = {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        };

        /* 1. Published quizzes */
        const { data: quizData } = await axios.get(
          `${URL}/api/quizzes/published`,
          config,
        );
        setQuizzes(quizData);

        /* 2. Student's previous submissions */
        const { data: submissions } = await axios.get(
          `${URL}/api/grades/${user._id}`,
          config,
        );
        const submissionMap = submissions.reduce((acc, sub) => {
          acc[sub.quiz._id] = sub;
          return acc;
        }, {});
        setPreviousSubs(submissionMap);
      } catch (err) {
        if (axios.isCancel(err)) return; // Ignore aborts
        setMessage(`Error fetching quizzes: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    /* Cleanup → abort any ongoing request */
    return () => controller.abort();
  }, [user]);

  /* ──────────────── Helpers ──────────────── */
  const resetStateForNewQuiz = () => {
    setAnswers({});
    setScore(null);
    setMessage('');
    setHighlightUnanswered(false);
  };

  // Return to the "Take a Quiz / Select a Quiz" list view from the result panel.
  const handleBackToList = () => {
    setSelectedQuiz(null);
    resetStateForNewQuiz();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuizSelect = (quiz) => {
    // Prevent multi‑attempts if not allowed
    if (!quiz.allowMultipleSubmissions && previousSubmissions[quiz._id]) {
      setMessage(
        'You have already submitted this quiz. Multiple attempts are not allowed.',
      );
      return;
    }
    setSelectedQuiz(quiz);
    resetStateForNewQuiz();
  };

  const handleAnswerChange = useCallback((questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }, []);

  const isQuizComplete = () =>
    selectedQuiz &&
    selectedQuiz.questions.every((q) => answers[q._id] !== undefined);

  // Questions still missing an answer, in their on-screen order.
  const unansweredQuestions = selectedQuiz
    ? selectedQuiz.questions.filter((q) => answers[q._id] === undefined)
    : [];
  const unansweredCount = unansweredQuestions.length;

  // Smooth-scroll the topmost unanswered question into view (and flag the
  // unanswered ones so they're easy to spot).
  const scrollToFirstUnanswered = useCallback(() => {
    setHighlightUnanswered(true);
    const first = selectedQuiz?.questions.find((q) => answers[q._id] === undefined);
    if (!first) return;
    const el = document.getElementById(`tq-q-${first._id}`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedQuiz, answers]);

  /* Submit for grading */
  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    // Block submission until every question is answered, but tell the student
    // exactly why (count) and take them to the first one that needs answering.
    if (!isQuizComplete()) {
      scrollToFirstUnanswered();
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${URL}/api/quizzes/${selectedQuiz._id}/submit`,
        { answers, studentId: user._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setScore(data.score);
      setMessage('Quiz submitted successfully!');
      // Refresh submissions so a subsequent attempt is blocked if needed.
      setPreviousSubs((prev) => ({
        ...prev,
        [selectedQuiz._id]: { quiz: selectedQuiz, score: data.score },
      }));
    } catch (err) {
      setMessage(`Error submitting quiz: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /* ──────────────── Render Blocks ──────────────── */
  // Bucket quizzes by status and sort each bucket so the most actionable
  // items surface first within their group.
  //   • To Do (not taken)      → soonest due date first
  //   • Needs Improvement (<80) → lowest score first
  //   • Completed (≥80)         → highest score first
  const groupedQuizzes = useMemo(() => {
    const buckets = { 'not-taken': [], 'needs-work': [], passed: [] };
    quizzes.forEach((quiz) => {
      const submission = previousSubmissions[quiz._id];
      buckets[quizStatus(submission)].push({ quiz, submission });
    });

    const dueTime = (q) => (q.dueDate ? new Date(q.dueDate).getTime() : Infinity);
    buckets['not-taken'].sort((a, b) => dueTime(a.quiz) - dueTime(b.quiz));
    buckets['needs-work'].sort((a, b) => (a.submission?.score ?? 0) - (b.submission?.score ?? 0));
    buckets.passed.sort((a, b) => (b.submission?.score ?? 0) - (a.submission?.score ?? 0));

    return buckets;
  }, [quizzes, previousSubmissions]);

  const QUIZ_GROUPS = [
    { key: 'not-taken', label: 'To Do' },
    { key: 'needs-work', label: 'Needs Improvement' },
    { key: 'passed', label: 'Completed' },
  ];

  const renderQuizList = () => {
    const hasAny = quizzes.length > 0;
    return (
      <div>
        <h3>Select a Quiz</h3>
        {!hasAny && !isLoading && (
          <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
            No published quizzes are available right now.
          </p>
        )}
        {QUIZ_GROUPS.map(({ key, label }) => {
          const items = groupedQuizzes[key];
          if (!items.length) return null;
          return (
            <section key={key} style={{ marginBottom: 28 }}>
              <h4
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  margin: '0 0 12px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#475569',
                }}
              >
                {label}
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                  {items.length}
                </span>
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 14,
                }}
              >
                {items.map(({ quiz, submission }) => (
                  <QuizCard
                    key={quiz._id}
                    quiz={quiz}
                    submission={submission}
                    status={key}
                    disabled={isLoading}
                    onSelect={handleQuizSelect}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const renderQuestion = (question) => {
    const isUnanswered = answers[question._id] === undefined;
    const flagged = highlightUnanswered && isUnanswered;
    return (
    <div
      key={question._id}
      id={`tq-q-${question._id}`}
      style={{
        borderBottom: '1px solid #ddd',
        // When flagged after a blocked submit, outline the whole question so
        // it's unmistakable which ones still need an answer.
        border: flagged ? '2px solid #dc2626' : undefined,
        borderRadius: flagged ? 8 : undefined,
        background: flagged ? '#fef2f2' : undefined,
        padding: '15px',
        marginBottom: '15px',
        scrollMarginTop: '90px',
      }}
    >
      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>
        {question.questionText}
        {flagged && (
          <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 8, fontSize: '0.85rem' }}>
            ● Needs an answer
          </span>
        )}
      </p>

      {/* Optional question image */}
      {question.image && (
        <img
          src={question.image}
          alt="Question visual"
          style={{
            maxWidth: '100%',
            marginBottom: '10px',
            borderRadius: '4px',
          }}
        />
      )}

      <div className="options-container">
        {question.options.map((option, idx) => {
          const isChosen = answers[question._id] === option;
          return (
            <div
              key={idx}
              onClick={() => handleAnswerChange(question._id, option)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px',
                marginBottom: '10px',
                cursor: 'pointer',
                border: isChosen ? '2px solid #007bff' : '1px solid #ccc',
                borderRadius: '5px',
                backgroundColor: isChosen ? '#e7f5ff' : '#fff',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid #007bff',
                  marginRight: '10px',
                  backgroundColor: isChosen ? '#007bff' : '#fff',
                  transition: 'background-color 0.2s',
                }}
              />
              <span>{option}</span>
            </div>
          );
        })}
      </div>
    </div>
    );
  };

  const renderQuizForm = () => (
    <form onSubmit={handleSubmitQuiz}>
      <h3 style={{ color: '#555', marginBottom: '20px' }}>
        {selectedQuiz.title}
      </h3>
      {selectedQuiz.questions.map(renderQuestion)}

      {/* Why-can't-I-submit banner. Always visible while any question is
          unanswered so the student knows what's blocking them, with a button
          that scrolls to the first one needing an answer. */}
      {unansweredCount > 0 && (
        <div
          role="status"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: '#fff7ed',
            border: '1px solid #fdba74',
            color: '#9a3412',
            padding: '12px 16px',
            borderRadius: 8,
            margin: '4px 0 16px',
            fontWeight: 600,
          }}
        >
          <span>
            {unansweredCount} of {selectedQuiz.questions.length} question
            {selectedQuiz.questions.length === 1 ? '' : 's'} still unanswered. Answer every
            question to submit.
          </span>
          <button
            type="button"
            onClick={scrollToFirstUnanswered}
            style={{
              padding: '8px 14px',
              background: '#ea580c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 700,
              cursor: 'pointer',
              maxWidth: 'none',
              margin: 0,
              alignSelf: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            Go to first unanswered
          </button>
        </div>
      )}

      <button
        type="submit"
        style={{
          ...primaryButtonStyle,
          // Keep the button clickable even while incomplete so a click can
          // explain why and jump to the first unanswered question; only dim it
          // (and disable) during the actual submit request.
          opacity: isLoading ? 0.6 : 1,
          backgroundColor: unansweredCount > 0 ? '#94a3b8' : primaryButtonStyle.backgroundColor,
          cursor: isLoading ? 'wait' : 'pointer',
        }}
        disabled={isLoading}
        aria-disabled={unansweredCount > 0}
      >
        {isLoading ? 'Submitting...' : 'Submit Quiz'}
      </button>
    </form>
  );

  /* ──────────────── Main Return ──────────────── */
  // Format ms → "M:SS" for the expiry banner. Clamps to 0 so we never show
  // "-1:23" if the timer drifts past expiry before the interceptor fires.
  const formatRemaining = (ms) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = String(totalSec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // The quiz-selection grid benefits from a wider canvas so cards fill the
  // viewport; the quiz-taking form stays narrow for readability.
  const isListView = score === null && !selectedQuiz;

  return (
    <div style={{ ...containerStyle, maxWidth: isListView ? 1100 : 800 }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Take a Quiz</h2>

      {/* Session-expiry warning. Banner appears in the last 10 minutes of
          the JWT's lifetime while a quiz is in progress so the student can
          submit before they're auto-logged-out. */}
      {showExpiryWarning && (
        <div
          role="alert"
          style={{
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #f59e0b',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 14,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          ⚠ Your session expires in {formatRemaining(msLeft)}. Submit your quiz soon — once the
          session expires you'll be logged out and any unsubmitted answers will be lost.
        </div>
      )}

      {/* Global feedback */}
      {message && (
        <p style={{ color: message.startsWith('Error') ? 'red' : 'green', textAlign: 'center' }}>
          {message}
        </p>
      )}

      {/* Loading indicator (simple text, replace with spinner if desired) */}
      {isLoading && !selectedQuiz && <p style={{ textAlign: 'center' }}>Loading…</p>}

      {/* Score → QuizForm → QuizList cascade */}
      {score !== null
        ? <ScoreCard score={score} onBack={handleBackToList} />
        : selectedQuiz
          ? renderQuizForm()
          : renderQuizList()}

      {/* Bouncing hint that there's more content below the fold. */}
      <ScrollChevron />
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Runtime prop validation                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
TakeQuiz.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string.isRequired,
  }).isRequired,
};

export default TakeQuiz;
