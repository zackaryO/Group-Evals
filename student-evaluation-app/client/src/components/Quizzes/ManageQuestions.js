// student-evaluation-app\client\src\components\Quizzes\ManageQuestions.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import URL from '../../backEndURL';
import './ManageQuestions.css'; // Import the CSS

/**
 * ManageQuestions Component
 *
 * Allows instructors to add, edit, or delete questions for a specific quiz.
 * Includes support for uploading an optional question image, stored on the backend.
 */
const ManageQuestions = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('a');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [message, setMessage] = useState('');
  const [questionImage, setQuestionImage] = useState(null);

  useEffect(() => {
    /**
     * Fetch the quiz data from the server.
     */
    const fetchQuiz = async () => {
      try {
        const response = await axios.get(`${URL}/api/quizzes/${quizId}`);
        setQuiz(response.data);
      } catch (error) {
        setMessage('Error fetching quiz: ' + error.message);
      }
    };
    fetchQuiz();
  }, [quizId]);

  /**
   * Handle creating a new question or updating an existing question.
   * Submits data (including image if provided) via multipart/form-data.
   */
  const handleAddOrEditQuestion = async (e) => {
    e.preventDefault();

    try {
      // Map the letter ('a','b','c','d') to the corresponding option text.
      const correctAnswerOption = options[correctAnswer.charCodeAt(0) - 97];

      // Prepare form data for multipart/form-data submission
      const formData = new FormData();
      formData.append('questionText', questionText);
      formData.append('correctAnswer', correctAnswerOption);
      formData.append('options', JSON.stringify(options)); // We'll parse on server
      // Only append if we actually have a new image selected
      if (questionImage) {
        formData.append('questionImage', questionImage);
      }

      if (editingQuestion) {
        // Editing existing question
        const response = await axios.put(
          `${URL}/api/quizzes/${quizId}/question/${editingQuestion._id}`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        // Update local quiz state
        setQuiz((prevQuiz) => ({
          ...prevQuiz,
          questions: prevQuiz.questions.map((q) =>
            q._id === response.data._id ? response.data : q
          ),
        }));
        setMessage('Question updated successfully');
      } else {
        // Adding a new question
        const response = await axios.post(
          `${URL}/api/quizzes/${quizId}/add-question`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          }
        );

        // Update local quiz state
        setQuiz((prevQuiz) => ({
          ...prevQuiz,
          questions: [...prevQuiz.questions, response.data],
        }));
        setMessage('Question added successfully');
      }

      // Reset fields
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('a');
      setEditingQuestion(null);
      setQuestionImage(null);
    } catch (error) {
      setMessage('Error saving question: ' + error.message);
    }
  };

  /**
   * Initiate edit mode for a particular question.
   * Loads existing question data into the form.
   */
  const handleEdit = (question) => {
    setEditingQuestion(question);
    setQuestionText(question.questionText);
    setOptions(question.options);
    setCorrectAnswer(
      String.fromCharCode(97 + question.options.indexOf(question.correctAnswer))
    );
    setQuestionImage(null); // Reset the local image state (only set if new image is uploaded)
  };

  /**
   * Delete a question by its ID.
   */
  const handleDelete = async (questionId) => {
    try {
      await axios.delete(`${URL}/api/quizzes/${quizId}/question/${questionId}`);
      setQuiz((prevQuiz) => ({
        ...prevQuiz,
        questions: prevQuiz.questions.filter((q) => q._id !== questionId),
      }));
      setMessage('Question deleted successfully');
    } catch (error) {
      setMessage('Error deleting question: ' + error.message);
    }
  };

  /**
   * Handle file input for question image.
   */
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setQuestionImage(e.target.files[0]);
    }
  };

  return (
    <div className="manage-questions-container">
      <h2>Manage Questions for {quiz ? quiz.title : 'Loading...'}</h2>
      {message && <p style={{ color: 'red' }}>{message}</p>}
      <form onSubmit={handleAddOrEditQuestion}>
        <label>
          Question Text:
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            required
            className="question-text"
          />
        </label>

        <label>
          Options:
          {['A', 'B', 'C', 'D'].map((letter, index) => (
            <div key={index} className="option-item">
              <input
                type="radio"
                name="correctAnswer"
                value={String.fromCharCode(97 + index)}
                checked={correctAnswer === String.fromCharCode(97 + index)}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />
              <span>{letter}</span>
              <input
                type="text"
                value={options[index]}
                onChange={(e) =>
                  setOptions((prevOptions) =>
                    prevOptions.map((opt, idx) =>
                      idx === index ? e.target.value : opt
                    )
                  )
                }
                required
              />
            </div>
          ))}
        </label>

        <label>
          Question Image (optional):
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>

        <button type="submit">
          {editingQuestion ? 'Update' : 'Add'} Question
        </button>
      </form>

      {quiz && quiz.questions && quiz.questions.length > 0 ? (
        <div className="questions-list">
          {quiz.questions.map((question) => (
            <div key={question._id} className="question-card">
              <p className="question-text-display">{question.questionText}</p>

              {/* Display image if available */}
              {question.image && (
                <img
                  src={question.image}
                  alt="Question"
                  className="question-image-display"
                />
              )}

              <p className="options-display">
                <strong>Options:</strong> {question.options.join(', ')}
              </p>
              <p className="correct-answer-display">
                <strong>Correct Answer:</strong> {question.correctAnswer}
              </p>
              <div className="question-actions">
                <button onClick={() => handleEdit(question)}>Edit</button>
                <button onClick={() => handleDelete(question._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No questions available.</p>
      )}
    </div>
  );
};

export default ManageQuestions;
