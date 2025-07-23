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
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook } from '@fortawesome/free-solid-svg-icons';

import URL from '../../backEndURL';

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

const cardStyle = {
  marginTop: '20px',
  padding: '10px',
  backgroundColor: '#e7f5ff',
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
 * <ScoreCard /> – tiny helper component
 * -------------------------------------
 * Renders the student’s quiz score rounded to **one decimal place**.
 *
 * @param   {number} score Raw score, e.g. 92.666
 * @returns {JSX.Element}
 */
const ScoreCard = ({ score }) => (
  <div style={cardStyle}>
    <h3>Your&nbsp;Score:&nbsp;{Number.isFinite(score) ? score.toFixed(1) : '0.0'}%</h3>
    <Link to="/quiz-gradebook" className="navbar-link">
      <FontAwesomeIcon icon={faBook} />&nbsp;See&nbsp;Missed&nbsp;Questions 
    </Link>
  </div>
);

ScoreCard.propTypes = {
  score: PropTypes.number.isRequired,
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

  /* ──────────────── Fetch Quizzes & Submissions ──────────────── */
  useEffect(() => {
    if (!user?._id) return;

    const controller = new AbortController(); // so we can abort on unmount

    const fetchData = async () => {
      setIsLoading(true);
      try {
        /* 1. Published quizzes */
        const { data: quizData } = await axios.get(
          `${URL}/api/quizzes/published`,
          { signal: controller.signal },
        );
        setQuizzes(quizData);

        /* 2. Student's previous submissions */
        const { data: submissions } = await axios.get(
          `${URL}/api/grades/${user._id}`,
          { signal: controller.signal },
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

  /* Submit for grading */
  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    if (!isQuizComplete()) return;

    setIsLoading(true);
    try {
      const { data } = await axios.post(
        `${URL}/api/quizzes/${selectedQuiz._id}/submit`,
        { answers, studentId: user._id },
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
  const renderQuizList = () => (
    <div>
      <h3>Select a Quiz</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {quizzes.map((quiz) => (
          <li key={quiz._id} style={{ marginBottom: '15px' }}>
            <button
              onClick={() => handleQuizSelect(quiz)}
              style={primaryButtonStyle}
              disabled={isLoading}
            >
              {quiz.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderQuestion = (question) => (
    <div
      key={question._id}
      style={{
        borderBottom: '1px solid #ddd',
        padding: '15px 0',
        marginBottom: '15px',
      }}
    >
      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>
        {question.questionText}
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

  const renderQuizForm = () => (
    <form onSubmit={handleSubmitQuiz}>
      <h3 style={{ color: '#555', marginBottom: '20px' }}>
        {selectedQuiz.title}
      </h3>
      {selectedQuiz.questions.map(renderQuestion)}
      <button
        type="submit"
        style={primaryButtonStyle}
        disabled={!isQuizComplete() || isLoading}
      >
        {isLoading ? 'Submitting...' : 'Submit Quiz'}
      </button>
    </form>
  );

  /* ──────────────── Main Return ──────────────── */
  return (
    <div style={containerStyle}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Take a Quiz</h2>

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
        ? <ScoreCard score={score} />
        : selectedQuiz
          ? renderQuizForm()
          : renderQuizList()}
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
