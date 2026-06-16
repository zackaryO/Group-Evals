// student-evaluation-app/client/src/components/Quizzes/GradeResponses.jsx
//
// Instructor page for hand-grading the free-response (open-ended) answers of a
// quiz, e.g. the Mechanical Aptitude Test's scenario and short-answer items.
// Multiple-choice questions are already auto-scored; here the instructor awards
// 0 to 1 point per written answer. Saving recomputes the submission's overall
// score (1 point per question) and clears its "needs grading" flag once every
// open-ended answer has a points value.

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import URL from '../../backEndURL';
import { SAMPLE_ANSWERS } from './AptitudeTest';

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

const card = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '18px 20px',
  marginBottom: 18,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
};

const btn = (bg, color = '#fff') => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: bg,
  color,
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  cursor: 'pointer',
  maxWidth: 'none',
  margin: 0,
  alignSelf: 'auto',
});

const studentName = (s) => {
  if (!s) return 'Unknown student';
  const full = `${s.firstName || ''} ${s.lastName || ''}`.trim();
  return full || s.username || 'Unknown student';
};

const POINT_CHOICES = [0, 0.25, 0.5, 0.75, 1];

const GradeResponses = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [subs, setSubs] = useState([]);
  // draft[submissionId][questionId] = number (0..1)
  const [draft, setDraft] = useState({});
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: quizData }, { data: gradeData }] = await Promise.all([
          axios.get(`${URL}/api/quizzes/${quizId}`, authHeaders()),
          axios.get(`${URL}/api/grades?quizId=${quizId}`, authHeaders()),
        ]);
        setQuiz(quizData);
        setSubs(gradeData);

        // Seed the draft from any points already awarded.
        const seed = {};
        gradeData.forEach((sub) => {
          seed[sub._id] = {};
          (sub.answers || []).forEach((a) => {
            const q = a.question;
            if (q && q.questionType === 'open-ended' && typeof a.pointsAwarded === 'number') {
              seed[sub._id][q._id] = a.pointsAwarded;
            }
          });
        });
        setDraft(seed);
      } catch (err) {
        setMessage(`Error loading submissions: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [quizId]);

  const openEndedCount = useMemo(
    () => (quiz?.questions || []).filter((q) => q.questionType === 'open-ended').length,
    [quiz]
  );

  const setPoints = (subId, qId, value) => {
    setDraft((prev) => ({
      ...prev,
      [subId]: { ...(prev[subId] || {}), [qId]: value },
    }));
  };

  const handleSave = async (sub) => {
    const grades = draft[sub._id] || {};
    // Only send numeric, in-range values.
    const clean = {};
    Object.entries(grades).forEach(([qId, v]) => {
      const n = Number(v);
      if (Number.isFinite(n)) clean[qId] = Math.max(0, Math.min(1, n));
    });

    setSavingId(sub._id);
    setMessage('');
    try {
      const { data } = await axios.put(
        `${URL}/api/quizzes/${quizId}/submission/${sub._id}/grade`,
        { grades: clean },
        authHeaders()
      );
      // Merge the recomputed score / flag and awarded points back into state.
      setSubs((prev) =>
        prev.map((s) => {
          if (s._id !== sub._id) return s;
          const updatedAnswers = (s.answers || []).map((a) => {
            const qid = a.question?._id;
            return qid && Object.prototype.hasOwnProperty.call(clean, qid)
              ? { ...a, pointsAwarded: clean[qid] }
              : a;
          });
          return { ...s, score: data.score, needsGrading: data.needsGrading, answers: updatedAnswers };
        })
      );
      setMessage(`Saved grades for ${studentName(sub.student)}. Score is now ${Number(data.score).toFixed(1)}%.`);
    } catch (err) {
      setMessage(`Error saving grades: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const mcSummary = (sub) => {
    const mc = (sub.answers || []).filter((a) => a.question && a.question.questionType !== 'open-ended');
    const correct = mc.filter((a) => a.isCorrect).length;
    return `${correct} / ${mc.length}`;
  };

  // Submissions awaiting grading float to the top.
  const ordered = useMemo(
    () => [...subs].sort((a, b) => Number(!!b.needsGrading) - Number(!!a.needsGrading)),
    [subs]
  );

  const pending = subs.filter((s) => s.needsGrading).length;

  return (
    <div style={{ maxWidth: 900, margin: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Grade Responses{quiz ? `: ${quiz.title}` : ''}</h2>
        <Link to="/manage-quizzes" style={{ ...btn('#fff', '#334155'), border: '1px solid #cbd5e1', textDecoration: 'none' }}>
          Back to Manage Quizzes
        </Link>
      </div>

      {openEndedCount === 0 && quiz && (
        <p style={{ color: '#64748b' }}>
          This quiz has no free-response questions. Multiple-choice scores are already final in the gradebook.
        </p>
      )}

      {quiz && openEndedCount > 0 && (
        <p style={{ color: '#475569' }}>
          {pending > 0
            ? `${pending} of ${subs.length} submission${subs.length === 1 ? '' : 's'} still need grading. Award 0 to 1 point per written answer.`
            : `All ${subs.length} submission${subs.length === 1 ? '' : 's'} graded.`}
        </p>
      )}

      {message && (
        <p style={{ color: message.startsWith('Error') ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{message}</p>
      )}

      {loading && <p>Loading...</p>}
      {!loading && subs.length === 0 && <p style={{ color: '#94a3b8' }}>No submissions yet.</p>}

      {ordered.map((sub) => {
        const openAnswers = (sub.answers || []).filter((a) => a.question && a.question.questionType === 'open-ended');
        return (
          <div key={sub._id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: '1.05rem' }}>{studentName(sub.student)}</strong>
                <span style={{ color: '#94a3b8', marginLeft: 10, fontSize: '0.85rem' }}>
                  {sub.date ? new Date(sub.date).toLocaleString() : ''}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>Multiple choice: {mcSummary(sub)}</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{Number(sub.score || 0).toFixed(1)}%</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 999,
                    color: '#fff',
                    background: sub.needsGrading ? '#ea580c' : '#16a34a',
                  }}
                >
                  {sub.needsGrading ? 'NEEDS GRADING' : 'GRADED'}
                </span>
              </div>
            </div>

            {openAnswers.map((a) => {
              const q = a.question;
              const current = draft[sub._id]?.[q._id];
              const sample = SAMPLE_ANSWERS[q.key];
              return (
                <div key={q._id} style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 12 }}>
                  <p style={{ fontWeight: 700, margin: '0 0 6px' }}>{q.questionText}</p>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>Student answer: </span>
                    {a.typedAnswer && a.typedAnswer.trim() ? a.typedAnswer : <em style={{ color: '#94a3b8' }}>(no answer)</em>}
                  </div>
                  {sample && (
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '8px 12px', marginTop: 6 }}>
                      <span style={{ color: '#0369a1', fontWeight: 700 }}>Sample answer: </span>
                      <span style={{ color: '#0c4a6e' }}>{sample}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', color: '#475569', marginRight: 4 }}>Points:</span>
                    {POINT_CHOICES.map((p) => {
                      const active = current === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPoints(sub._id, q._id, p)}
                          style={{
                            ...btn(active ? '#2563eb' : '#fff', active ? '#fff' : '#334155'),
                            border: active ? '1px solid #2563eb' : '1px solid #cbd5e1',
                            padding: '5px 11px',
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <span style={{ fontSize: '0.8rem', color: typeof current === 'number' ? '#16a34a' : '#ea580c', fontWeight: 700, marginLeft: 6 }}>
                      {typeof current === 'number' ? `Awarded ${current}` : 'Not graded'}
                    </span>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                style={{ ...btn(savingId === sub._id ? '#94a3b8' : '#16a34a'), cursor: savingId === sub._id ? 'wait' : 'pointer' }}
                onClick={() => handleSave(sub)}
                disabled={savingId === sub._id}
              >
                {savingId === sub._id ? 'Saving...' : 'Save grades'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GradeResponses;
