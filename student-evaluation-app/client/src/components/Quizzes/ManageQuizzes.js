// student-evaluation-app\client\src\components\Quizzes\ManageQuizzes.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import URL from '../../backEndURL';
import './ManageQuizzes.css';

/**
 * ManageQuizzes Component
 *
 * Displays a grid of quiz cards, each with actions to Publish/Unpublish,
 * Manage Questions, Delete the quiz, and toggle multiple submissions.
 */
const ManageQuizzes = ({ user }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get(`${URL}/api/quizzes`);
        setQuizzes(response.data);
      } catch (error) {
        setMessage('Error fetching quizzes: ' + error.message);
      }
    };
    fetchQuizzes();
  }, []);

  /**
   * Toggle the isPublished state of a quiz.
   */
  const handlePublishToggle = async (quizId) => {
    try {
      const response = await axios.put(`${URL}/api/quizzes/${quizId}/publish`);
      const updatedQuizzes = quizzes.map((quiz) =>
        quiz._id === quizId ? response.data : quiz
      );
      setQuizzes(updatedQuizzes);
      setMessage(
        `Quiz "${response.data.title}" is now ${
          response.data.isPublished ? 'published' : 'unpublished'
        }.`
      );
    } catch (error) {
      setMessage('Error updating quiz: ' + error.message);
    }
  };

  /**
   * Toggle whether multiple submissions are allowed for a quiz.
   */
  const handleAllowMultipleSubmissionsToggle = async (quizId, currentValue) => {
    try {
      const response = await axios.put(
        `${URL}/api/quizzes/${quizId}/toggle-multiple-submissions`,
        {
          allowMultipleSubmissions: !currentValue,
        }
      );
      const updatedQuizzes = quizzes.map((quiz) =>
        quiz._id === quizId ? response.data : quiz
      );
      setQuizzes(updatedQuizzes);
      setMessage(
        `Allow multiple submissions for quiz "${response.data.title}" is now ${
          response.data.allowMultipleSubmissions ? 'enabled' : 'disabled'
        }.`
      );
    } catch (error) {
      setMessage('Error updating quiz: ' + error.message);
    }
  };

  /**
   * Delete a quiz by ID.
   */
  const handleDeleteQuiz = async (quizId) => {
    try {
      await axios.delete(`${URL}/api/quizzes/${quizId}`);
      setQuizzes(quizzes.filter((quiz) => quiz._id !== quizId));
      setMessage('Quiz deleted successfully.');
    } catch (error) {
      setMessage('Error deleting quiz: ' + error.message);
    }
  };

  return (
    <div className="manage-quizzes-container">
      <h2>Manage Quizzes</h2>
      {message && <p>{message}</p>}
      <div className="quizzes-grid">
        {quizzes.map((quiz) => (
          <div key={quiz._id} className="quiz-card">
            <h3>{quiz.title}</h3>
            <p>{quiz.isPublished ? 'Published' : 'Unpublished'}</p>

            <div className="quiz-actions">
              <button onClick={() => handlePublishToggle(quiz._id)}>
                {quiz.isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <Link to={`/manage-questions/${quiz._id}`}>
                <button>Manage Questions</button>
              </Link>
              <button
                onClick={() => handleDeleteQuiz(quiz._id)}
                className="delete-button"
              >
                Delete
              </button>
            </div>

            <label className="multiple-submissions-toggle">
              <input
                type="checkbox"
                checked={quiz.allowMultipleSubmissions}
                onChange={() =>
                  handleAllowMultipleSubmissionsToggle(
                    quiz._id,
                    quiz.allowMultipleSubmissions
                  )
                }
              />
              Allow Multiple Submissions
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManageQuizzes;
