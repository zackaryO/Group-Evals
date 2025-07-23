// student-evaluation-app/client/src/components/Quizzes/ManageQuestions.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import URL from '../../backEndURL';
import './ManageQuestions.css';

// 👉 Replace this with your real auth-token lookup
const getAuthToken = () => localStorage.getItem('token') || '';

const ManageQuestions = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('a');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [message, setMessage] = useState('');
  const [questionImage, setQuestionImage] = useState(null);

  // ───────────────────────────────────────── Fetch quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`${URL}/api/quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${getAuthToken()}` },
        });
        setQuiz(res.data);
      } catch (err) {
        setMessage(`Error fetching quiz: ${err.message}`);
      }
    };
    fetchQuiz();
  }, [quizId]);

  // ───────────────────────────────────────── Add / Edit handler
  const handleAddOrEditQuestion = async (e) => {
    e.preventDefault();

    try {
      const correctAnswerOption = options[correctAnswer.charCodeAt(0) - 97];

      const fd = new FormData();
      fd.append('questionText', questionText);
      fd.append('correctAnswer', correctAnswerOption);
      fd.append('options', JSON.stringify(options));
      if (questionImage) fd.append('questionImage', questionImage);

      const axiosConfig = { headers: { Authorization: `Bearer ${getAuthToken()}` } };

      let res;
      if (editingQuestion) {
        // PUT (update)
        res = await axios.put(
          `${URL}/api/quizzes/${quizId}/question/${editingQuestion._id}`,
          fd,
          axiosConfig
        );

        setQuiz((prev) => ({
          ...prev,
          questions: prev.questions.map((q) =>
            q._id === res.data._id ? res.data : q
          ),
        }));
        setMessage('Question updated successfully');
      } else {
        // POST (create)
        res = await axios.post(
          `${URL}/api/quizzes/${quizId}/add-question`,
          fd,
          axiosConfig
        );

        setQuiz((prev) => ({
          ...prev,
          questions: [...prev.questions, res.data],
        }));
        setMessage('Question added successfully');
      }

      // reset form
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('a');
      setEditingQuestion(null);
      setQuestionImage(null);
    } catch (err) {
      // Show server‑provided message if available
      setMessage(
        err.response?.data?.message
          ? `Error: ${err.response.data.message}`
          : `Error saving question: ${err.message}`
      );
    }
  };

  // ───────────────────────────────────────── Edit / Delete helpers
  const handleEdit = (q) => {
    setEditingQuestion(q);
    setQuestionText(q.questionText);
    setOptions(q.options);
    setCorrectAnswer(
      String.fromCharCode(97 + q.options.indexOf(q.correctAnswer))
    );
    setQuestionImage(null);
  };

  const handleDelete = async (questionId) => {
    try {
      await axios.delete(
        `${URL}/api/quizzes/${quizId}/question/${questionId}`,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      setQuiz((prev) => ({
        ...prev,
        questions: prev.questions.filter((q) => q._id !== questionId),
      }));
      setMessage('Question deleted successfully');
    } catch (err) {
      setMessage(`Error deleting question: ${err.message}`);
    }
  };

  // ───────────────────────────────────────── Image picker
  const handleImageChange = (e) => {
    if (e.target.files?.[0]) setQuestionImage(e.target.files[0]);
  };

  // ───────────────────────────────────────── JSX
  return (
    <div className="manage-questions-container">
      <h2>
        Manage Questions for&nbsp;
        {quiz ? quiz.title : 'Loading…'}
      </h2>

      {message && <p style={{ color: 'red' }}>{message}</p>}

      <form onSubmit={handleAddOrEditQuestion}>
        {/* Question text */}
        <label>
          Question Text:
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            required
            className="question-text"
          />
        </label>

        {/* Options A‑D */}
        <label>
          Options:
          {['A', 'B', 'C', 'D'].map((letter, idx) => (
            <div key={idx} className="option-item">
              <input
                type="radio"
                name="correctAnswer"
                value={String.fromCharCode(97 + idx)}
                checked={correctAnswer === String.fromCharCode(97 + idx)}
                onChange={(e) => setCorrectAnswer(e.target.value)}
              />
              <span>{letter}</span>
              <input
                type="text"
                value={options[idx]}
                onChange={(e) =>
                  setOptions((prev) =>
                    prev.map((opt, i) => (i === idx ? e.target.value : opt))
                  )
                }
                required
              />
            </div>
          ))}
        </label>

        {/* Image */}
        <label>
          Question Image (optional):
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>

        <button type="submit">
          {editingQuestion ? 'Update' : 'Add'} Question
        </button>
      </form>

      {/* Existing questions */}
      {quiz?.questions?.length ? (
        <div className="questions-list">
          {quiz.questions.map((q) => (
            <div key={q._id} className="question-card">
              <p className="question-text-display">{q.questionText}</p>

              {q.image && (
                <img
                  src={q.image}
                  alt="Question"
                  className="question-image-display"
                />
              )}

              <p className="options-display">
                <strong>Options:</strong> {q.options.join(', ')}
              </p>
              <p className="correct-answer-display">
                <strong>Correct:</strong> {q.correctAnswer}
              </p>

              <div className="question-actions">
                <button onClick={() => handleEdit(q)}>Edit</button>
                <button onClick={() => handleDelete(q._id)}>Delete</button>
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
