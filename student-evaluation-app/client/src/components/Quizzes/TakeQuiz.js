// student-evaluation-app\client\src\components\Quizzes\TakeQuiz.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

/**
 * TakeQuiz Component
 *
 * Allows a student to select a published quiz, answer its questions (with optional images),
 * and submit for grading. Displays the score upon submission.
 */
const TakeQuiz = ({ user }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [message, setMessage] = useState('');
  const [previousSubmissions, setPreviousSubmissions] = useState({});

  useEffect(() => {
    /**
     * Fetch published quizzes and student's previous submissions.
     */
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get(`${URL}/api/quizzes/published`);
        setQuizzes(response.data);

        const submissionsResponse = await axios.get(
          `${URL}/api/grades/${user._id}`
        );
        const submissions = submissionsResponse.data.reduce((acc, submission) => {
          acc[submission.quiz._id] = submission;
          return acc;
        }, {});
        setPreviousSubmissions(submissions);
      } catch (error) {
        setMessage('Error fetching quizzes or submissions: ' + error.message);
      }
    };
    fetchQuizzes();
  }, [user]);

  /**
   * Select a quiz to take. Checks if multiple submissions are allowed.
   */
  const handleQuizSelect = (quiz) => {
    if (!quiz.allowMultipleSubmissions && previousSubmissions[quiz._id]) {
      setMessage(
        'You have already submitted this quiz and multiple attempts are not allowed.'
      );
      return;
    }

    setSelectedQuiz(quiz);
    setAnswers({});
    setScore(null);
    setMessage('');
  };

  /**
   * Update user's chosen answer in state.
   */
  const handleAnswerChange = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  /**
   * Submit the quiz answers to the server for grading.
   */
  const handleSubmitQuiz = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${URL}/api/quizzes/${selectedQuiz._id}/submit`,
        { answers, studentId: user._id }
      );
      setScore(response.data.score);
      setMessage('Quiz submitted successfully!');
    } catch (error) {
      setMessage('Error submitting quiz: ' + error.message);
    }
  };

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: 'auto',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#333' }}>Take a Quiz</h2>
      {message && <p style={{ color: 'red', textAlign: 'center' }}>{message}</p>}

      {score !== null ? (
        <div
          style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#e7f5ff',
            borderRadius: '8px',
          }}
        >
          <h3>Your Score: {score}%</h3>
        </div>
      ) : selectedQuiz ? (
        <form onSubmit={handleSubmitQuiz}>
          <h3 style={{ color: '#555', marginBottom: '20px' }}>
            {selectedQuiz.title}
          </h3>
          {selectedQuiz.questions.map((question) => (
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

              {/* If a question has an image, display it */}
              {question.image && (
                <img
                  src={`${URL}/uploads/${question.image}`}
                  alt="Question"
                  style={{
                    maxWidth: '100%',
                    marginBottom: '10px',
                    borderRadius: '4px',
                  }}
                />
              )}

              <div className="options-container">
                {question.options.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => handleAnswerChange(question._id, option)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px',
                      marginBottom: '10px',
                      cursor: 'pointer',
                      border:
                        answers[question._id] === option
                          ? '2px solid #007bff'
                          : '1px solid #ccc',
                      borderRadius: '5px',
                      backgroundColor:
                        answers[question._id] === option ? '#e7f5ff' : '#fff',
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid #007bff',
                        marginRight: '10px',
                        backgroundColor:
                          answers[question._id] === option ? '#007bff' : '#fff',
                      }}
                    />
                    <span>{option}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Submit Quiz
          </button>
        </form>
      ) : (
        <div>
          <h3>Select a Quiz</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {quizzes.map((quiz) => (
              <li key={quiz._id} style={{ marginBottom: '15px' }}>
                <button
                  onClick={() => handleQuizSelect(quiz)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {quiz.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TakeQuiz;
