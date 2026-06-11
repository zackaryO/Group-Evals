// student-evaluation-app\client\src\components\Quizzes\QuizGradebook.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import URL from '../../backEndURL';
import './QuizGradebook.css'; // Import the CSS

const scoreTier = (score) => {
  if (score == null || Number.isNaN(score)) return 'na';
  if (score >= 90) return 'high';
  if (score >= 70) return 'mid';
  return 'low';
};

const QuizGradebook = ({ user }) => {
  const [grades, setGrades] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletedQuizId, setDeletedQuizId] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  // Instructor-only filter / sort state. Students see only their own grades.
  const [cohortFilter, setCohortFilter] = useState('all');
  const [quizFilter, setQuizFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  // Full instructors (instructor/admin) see all students; electrical
  // instructors get an all-students view too, but the server scopes it to the
  // electrical students they added. Both are treated as the "instructor view".
  const isFullInstructorView = user.role === 'instructor' || user.role === 'admin';
  const isElectricalInstructorView = user.role === 'electrical_instructor';
  const isInstructor = isFullInstructorView || isElectricalInstructorView;

  useEffect(() => {
    if (!zoomedImage) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomedImage]);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        };
        let response;
        if (isInstructor) {
          response = await axios.get(`${URL}/api/grades/`, config);
        } else {
          response = await axios.get(`${URL}/api/grades/${user._id}`, config);
        }

        setGrades(response.data);
      } catch (error) {
        setMessage('Error fetching grades: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDelete = async (submissionId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      };
      await axios.delete(`${URL}/api/grades/${submissionId}`, config);
      setGrades((prevGrades) => prevGrades.filter((grade) => grade._id !== submissionId));
      setDeletedQuizId(submissionId); // Set the deleted quiz ID to trigger feedback
      setMessage('Submission deleted successfully.');
      setTimeout(() => setDeletedQuizId(null), 3000); // Clear feedback after 3 seconds
    } catch (error) {
      setMessage('Error deleting submission: ' + error.message);
    }
  };

  const handleQuizSelect = (quizId) => {
    setSelectedQuizId(quizId === selectedQuizId ? null : quizId);
  };

  const groupByStudent = (gradeList) => {
    const grouped = {};
    gradeList.forEach((grade) => {
      if (grade.student) {
        const studentId = grade.student._id;
        if (!grouped[studentId]) {
          grouped[studentId] = {
            student: grade.student,
            quizzes: [],
          };
        }
        grouped[studentId].quizzes.push(grade);
      }
    });
    return grouped;
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  // Build cohort dropdown choices from the data on screen.
  const cohortOptions = (() => {
    const seen = new Map();
    grades.forEach((g) => {
      const c = g.student && g.student.cohort;
      if (c && c._id) seen.set(String(c._id), c);
    });
    return Array.from(seen.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  })();

  // Build quiz dropdown choices from the data on screen.
  const quizOptions = (() => {
    const seen = new Map();
    grades.forEach((g) => {
      const q = g.quiz;
      if (q && q._id) seen.set(String(q._id), q);
    });
    return Array.from(seen.values()).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  })();

  const studentMatchesFilter = (student) => {
    if (!isInstructor || cohortFilter === 'all') return true;
    const cohort = student && student.cohort;
    const cohortActive = cohort ? cohort.isActive !== false : true;
    const studentActive = student ? student.isActive !== false : true;
    if (cohortFilter === 'active') return cohortActive && studentActive;
    if (cohortFilter === 'inactive') return !cohortActive || !studentActive;
    return cohort && String(cohort._id) === String(cohortFilter);
  };

  const quizMatchesFilter = (grade) =>
    quizFilter === 'all' || String(grade.quiz?._id) === String(quizFilter);

  const filteredGrades = grades.filter((g) => studentMatchesFilter(g.student));
  const groupedGrades = groupByStudent(filteredGrades);

  // Average of the currently-visible (quiz-filtered) submissions for a student.
  const visibleQuizzes = (sid) => groupedGrades[sid].quizzes.filter(quizMatchesFilter);
  const averageScore = (quizzes) => {
    if (!quizzes.length) return null;
    return quizzes.reduce((sum, q) => sum + (q.score || 0), 0) / quizzes.length;
  };
  // Score used for sorting students: a single quiz's score when a quiz filter is
  // active, otherwise the student's average across the visible quizzes.
  const scoreForStudent = (sid) => {
    const qz = visibleQuizzes(sid);
    if (!qz.length) return null;
    if (quizFilter !== 'all') return qz[0].score || 0;
    return averageScore(qz);
  };

  const compareNames = (a, b) => {
    const an = `${groupedGrades[a].student?.lastName || ''}${groupedGrades[a].student?.firstName || ''}`;
    const bn = `${groupedGrades[b].student?.lastName || ''}${groupedGrades[b].student?.firstName || ''}`;
    return an.localeCompare(bn);
  };

  const sortedStudentIds = (() => {
    const ids = Object.keys(groupedGrades);
    if (sortBy === 'cohort' && isInstructor) {
      ids.sort((a, b) => {
        const ac = groupedGrades[a].student?.cohort?.name || '';
        const bc = groupedGrades[b].student?.cohort?.name || '';
        return ac === bc ? compareNames(a, b) : ac.localeCompare(bc);
      });
    } else if (sortBy === 'score-desc' || sortBy === 'score-asc') {
      const dir = sortBy === 'score-asc' ? 1 : -1;
      ids.sort((a, b) => {
        const as = scoreForStudent(a);
        const bs = scoreForStudent(b);
        // Push students with no visible submissions to the bottom either way.
        if (as == null && bs == null) return compareNames(a, b);
        if (as == null) return 1;
        if (bs == null) return -1;
        return as === bs ? compareNames(a, b) : (as - bs) * dir;
      });
    } else {
      ids.sort(compareNames);
    }
    return ids;
  })();

  const sortQuizzes = (quizzes) => {
    if (sortBy === 'score-desc') return [...quizzes].sort((a, b) => (b.score || 0) - (a.score || 0));
    if (sortBy === 'score-asc') return [...quizzes].sort((a, b) => (a.score || 0) - (b.score || 0));
    return quizzes;
  };

  // Final render list: quiz-filtered, score-sorted within each card, empties dropped.
  const studentsToRender = sortedStudentIds
    .map((sid) => ({
      sid,
      student: groupedGrades[sid].student,
      quizzes: sortQuizzes(visibleQuizzes(sid)),
    }))
    .filter((entry) => entry.quizzes.length > 0);

  const totalSubmissions = studentsToRender.reduce((sum, e) => sum + e.quizzes.length, 0);

  const isStudentInactive = (student) => {
    if (!student) return false;
    const studentInactive = student.isActive === false;
    const cohortInactive = student.cohort && student.cohort.isActive === false;
    return studentInactive || cohortInactive;
  };

  const showToolbar = grades.length > 0;

  return (
    <div className="quiz-gradebook-container">
      <div className="quiz-gradebook-header">
        <h2>Quiz Gradebook</h2>
        {isFullInstructorView && (
          <Link to="/missed-questions" className="missed-questions-link">
            View All Missed Questions
          </Link>
        )}
      </div>
      {message && <p className="quiz-gradebook-message">{message}</p>}

      {showToolbar && (
        <div className="quiz-gradebook-filters">
          {isFullInstructorView && (
            <label className="gradebook-field">
              <span className="gradebook-field-label">Cohort</span>
              <select value={cohortFilter} onChange={(e) => setCohortFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
                {cohortOptions.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}{c.isActive === false ? ' (inactive)' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="gradebook-field">
            <span className="gradebook-field-label">Quiz</span>
            <select value={quizFilter} onChange={(e) => setQuizFilter(e.target.value)}>
              <option value="all">All quizzes</option>
              {quizOptions.map((q) => (
                <option key={q._id} value={q._id}>{q.title}</option>
              ))}
            </select>
          </label>
          <label className="gradebook-field">
            <span className="gradebook-field-label">Sort by</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Name</option>
              {isFullInstructorView && <option value="cohort">Cohort</option>}
              <option value="score-desc">Score (high → low)</option>
              <option value="score-asc">Score (low → high)</option>
            </select>
          </label>
          <div className="gradebook-summary">
            {studentsToRender.length} {studentsToRender.length === 1 ? 'student' : 'students'}
            {' · '}
            {totalSubmissions} {totalSubmissions === 1 ? 'submission' : 'submissions'}
          </div>
        </div>
      )}

      {studentsToRender.length > 0 ? (
        <div className="student-grades">
          {studentsToRender.map(({ sid, student: studentData, quizzes }) => {
            const inactive = isStudentInactive(studentData);
            const avg = averageScore(quizzes);
            return (
              <div
                key={sid}
                className={`student-grade ${inactive ? 'is-inactive' : ''} ${deletedQuizId === sid ? 'fade-out' : ''}`}
              >
                <div className="student-grade-header">
                  <div>
                    <h3>
                      {studentData.firstName} {studentData.lastName}
                      {inactive ? ' (inactive)' : ''}
                    </h3>
                    <p className="student-grade-meta">
                      {studentData.username}
                      {studentData.cohort?.name ? ` · ${studentData.cohort.name}` : ''}
                    </p>
                  </div>
                  {avg != null && (
                    <span
                      className={`score-badge score-badge-${scoreTier(avg)} score-badge-avg`}
                      title={quizFilter === 'all' ? 'Average score' : 'Score'}
                    >
                      {avg.toFixed(1)}%
                      <span className="score-badge-caption">
                        {quizFilter === 'all' ? 'avg' : 'score'}
                      </span>
                    </span>
                  )}
                </div>
                <div className="quiz-list">
                  {quizzes.map((quiz) => {
                    const expanded = selectedQuizId === quiz._id;
                    return (
                      <div key={quiz._id} className={`quiz-item ${deletedQuizId === quiz._id ? 'deleted' : ''}`}>
                        <div className="quiz-item-row">
                          <button
                            type="button"
                            className="quiz-item-toggle"
                            onClick={() => handleQuizSelect(quiz._id)}
                            aria-expanded={expanded}
                          >
                            <span className="quiz-item-caret">{expanded ? '▾' : '▸'}</span>
                            <span className="quiz-item-title">{quiz.quiz?.title || 'Quiz Title Missing'}</span>
                          </button>
                          <span className={`score-badge score-badge-${scoreTier(quiz.score)}`}>
                            {quiz.score != null ? `${quiz.score.toFixed(1)}%` : 'N/A'}
                          </span>
                          {isInstructor && (
                            <button
                              type="button"
                              className="quiz-item-delete"
                              onClick={() => handleDelete(quiz._id)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        {expanded && (
                          <div className="incorrect-answers">
                            <h4>Incorrect Answers:</h4>
                            {quiz.answers
                              .filter((answer) => !answer.isCorrect)
                              .map((answer, index) => {
                                const imageSrc = answer.question?.image;
                                return (
                                  <div key={index} className="answer-detail">
                                    <div className="answer-detail-text">
                                      <p><strong>Question:</strong> {answer.question?.questionText || 'Question text missing'}</p>
                                      <p><strong>Your Answer:</strong> {answer.selectedAnswer}</p>
                                      <p><strong>Correct Answer:</strong> {answer.question?.correctAnswer || 'Correct answer missing'}</p>
                                    </div>
                                    {imageSrc && (
                                      <button
                                        type="button"
                                        className="answer-detail-image-btn"
                                        onClick={() => setZoomedImage(imageSrc)}
                                        aria-label="Open question image at full size"
                                      >
                                        <img
                                          src={imageSrc}
                                          alt="Question reference"
                                          className="answer-detail-image"
                                          loading="lazy"
                                        />
                                        <span className="answer-detail-image-hint">Click to enlarge</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            {quiz.answers.filter((answer) => !answer.isCorrect).length === 0 && (
                              <p>All answers were correct!</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="quiz-gradebook-empty">No grades available.</p>
      )}

      {zoomedImage && (
        <div
          className="image-zoom-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Question image preview"
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            className="image-zoom-close"
            onClick={() => setZoomedImage(null)}
            aria-label="Close image preview"
          >
            ×
          </button>
          <img
            src={zoomedImage}
            alt="Question reference enlarged"
            className="image-zoom-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default QuizGradebook;
