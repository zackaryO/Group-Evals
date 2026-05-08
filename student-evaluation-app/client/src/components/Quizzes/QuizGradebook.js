// student-evaluation-app\client\src\components\Quizzes\QuizGradebook.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import URL from '../../backEndURL';
import './QuizGradebook.css'; // Import the CSS

const QuizGradebook = ({ user }) => {
  const [grades, setGrades] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletedQuizId, setDeletedQuizId] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  // Instructor-only filter / sort state. Students see only their own grades.
  const [cohortFilter, setCohortFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const isInstructor = user.role === 'instructor' || user.role === 'admin';

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
        if (user.role === 'instructor') {
          response = await axios.get(`${URL}/api/grades/`, config);
        } else {
          response = await axios.get(`${URL}/api/grades/${user._id}`, config);
        }

        console.log('Grades fetched: ', response.data); // Log the data received from backend
        setGrades(response.data);
      } catch (error) {
        setMessage('Error fetching grades: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
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

  const groupByStudent = (grades) => {
    const grouped = {};
    grades.forEach((grade) => {
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
    console.log('Grouped Grades by Student: ', JSON.stringify(grouped, null, 2)); // Detailed logging
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

  const studentMatchesFilter = (student) => {
    if (!isInstructor || cohortFilter === 'all') return true;
    const cohort = student && student.cohort;
    const cohortActive = cohort ? cohort.isActive !== false : true;
    const studentActive = student ? student.isActive !== false : true;
    if (cohortFilter === 'active') return cohortActive && studentActive;
    if (cohortFilter === 'inactive') return !cohortActive || !studentActive;
    return cohort && String(cohort._id) === String(cohortFilter);
  };

  const filteredGrades = grades.filter((g) => studentMatchesFilter(g.student));
  const groupedGrades = groupByStudent(filteredGrades);

  const sortedStudentIds = (() => {
    const ids = Object.keys(groupedGrades);
    if (!isInstructor) return ids;
    if (sortBy === 'cohort') {
      ids.sort((a, b) => {
        const ac = groupedGrades[a].student?.cohort?.name || '';
        const bc = groupedGrades[b].student?.cohort?.name || '';
        if (ac === bc) {
          const an = `${groupedGrades[a].student?.lastName || ''}${groupedGrades[a].student?.firstName || ''}`;
          const bn = `${groupedGrades[b].student?.lastName || ''}${groupedGrades[b].student?.firstName || ''}`;
          return an.localeCompare(bn);
        }
        return ac.localeCompare(bc);
      });
    } else if (sortBy === 'avg') {
      const avg = (sid) => {
        const qz = groupedGrades[sid].quizzes;
        if (!qz.length) return 0;
        return qz.reduce((sum, q) => sum + (q.score || 0), 0) / qz.length;
      };
      ids.sort((a, b) => avg(b) - avg(a));
    } else {
      ids.sort((a, b) => {
        const an = `${groupedGrades[a].student?.lastName || ''}${groupedGrades[a].student?.firstName || ''}`;
        const bn = `${groupedGrades[b].student?.lastName || ''}${groupedGrades[b].student?.firstName || ''}`;
        return an.localeCompare(bn);
      });
    }
    return ids;
  })();

  const isStudentInactive = (student) => {
    if (!student) return false;
    const studentInactive = student.isActive === false;
    const cohortInactive = student.cohort && student.cohort.isActive === false;
    return studentInactive || cohortInactive;
  };

  return (
    <div className="quiz-gradebook-container">
      <h2>Quiz Gradebook</h2>
      {message && <p>{message}</p>}
      {user.role === 'instructor' && (
        <Link to="/missed-questions" className="missed-questions-link">
          View All Missed Questions
        </Link>
      )}
      {isInstructor && (
        <div className="quiz-gradebook-filters" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '12px 0' }}>
          <label style={{ fontSize: 13 }}>
            Cohort:&nbsp;
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
          <label style={{ fontSize: 13 }}>
            Sort:&nbsp;
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Name</option>
              <option value="cohort">Cohort</option>
              <option value="avg">Average score</option>
            </select>
          </label>
        </div>
      )}
      {sortedStudentIds.length > 0 ? (
        <div className="student-grades">
          {sortedStudentIds.map((studentId) => {
            const studentData = groupedGrades[studentId].student;
            const inactive = isStudentInactive(studentData);
            const inactiveStyle = inactive ? { opacity: 0.55, color: '#6b7280' } : undefined;
            return (
              <div
                key={studentId}
                className={`student-grade ${deletedQuizId === studentId ? 'fade-out' : ''}`}
                style={inactiveStyle}
              >
                <h3>
                  {studentData.firstName} {studentData.lastName}
                  {inactive ? ' (inactive)' : ''}
                </h3>
                <p>
                  Username: {studentData.username}
                  {studentData.cohort?.name ? ` · Cohort: ${studentData.cohort.name}` : ''}
                </p>
                <div className="quiz-list">
                  {groupedGrades[studentId].quizzes.map((quiz) => (
                    <div key={quiz._id} className={`quiz-item ${deletedQuizId === quiz._id ? 'deleted' : ''}`}>
                      <span onClick={() => handleQuizSelect(quiz._id)}>
                        {quiz.quiz?.title || "Quiz Title Missing"}: {quiz.score?.toFixed(2)}%, <strong>Click to see missed questions.</strong>
                      </span>
                      {user.role === 'instructor' && (
                        <button onClick={() => handleDelete(quiz._id)}>Delete</button>
                      )}
                      {selectedQuizId === quiz._id && (
                        <div className="incorrect-answers">
                          <h4>Incorrect Answers:</h4>
                          {quiz.answers
                            .filter(answer => !answer.isCorrect)
                            .map((answer, index) => {
                              const imageSrc = answer.question?.image;
                              return (
                                <div key={index} className="answer-detail">
                                  <div className="answer-detail-text">
                                    <p><strong>Question:</strong> {answer.question?.questionText || "Question text missing"}</p>
                                    <p><strong>Your Answer:</strong> {answer.selectedAnswer}</p>
                                    <p><strong>Correct Answer:</strong> {answer.question?.correctAnswer || "Correct answer missing"}</p>
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
                          {quiz.answers.filter(answer => !answer.isCorrect).length === 0 && (
                            <p>All answers were correct!</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>No grades available.</p>
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
