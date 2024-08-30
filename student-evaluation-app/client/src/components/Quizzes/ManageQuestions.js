import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import URL from '../../backEndURL';
import './ManageQuestions.css'; // Import the CSS

const ManageQuestions = () => {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('a');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
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

  const handleAddOrEditQuestion = async (e) => {
    e.preventDefault();
    try {
      const correctAnswerOption = options[correctAnswer.charCodeAt(0) - 97];
      if (editingQuestion) {
        const response = await axios.put(`${URL}/api/quizzes/${quizId}/question/${editingQuestion._id}`, {
          questionText,
          options,
          correctAnswer: correctAnswerOption,
        });
        setQuiz((prevQuiz) => ({
          ...prevQuiz,
          questions: prevQuiz.questions.map((q) => (q._id === response.data._id ? response.data : q)),
        }));
        setMessage('Question updated successfully');
      } else {
        const response = await axios.post(`${URL}/api/quizzes/${quizId}/add-question`, {
          questionText,
          options,
          correctAnswer: correctAnswerOption,
        });
        setQuiz((prevQuiz) => ({
          ...prevQuiz,
          questions: [...prevQuiz.questions, response.data],
        }));
        setMessage('Question added successfully');
      }
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer('a');
      setEditingQuestion(null);
    } catch (error) {
      setMessage('Error saving question: ' + error.message);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setQuestionText(question.questionText);
    setOptions(question.options);
    setCorrectAnswer(String.fromCharCode(97 + question.options.indexOf(question.correctAnswer)));
  };

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

  return (
    <div className="manage-questions-container">
      <h2>Manage Questions for {quiz ? quiz.title : 'Loading...'}</h2>
      {message && <p>{message}</p>}
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
                    prevOptions.map((opt, idx) => (idx === index ? e.target.value : opt))
                  )
                }
                required
              />
            </div>
          ))}
        </label>
        <button type="submit">{editingQuestion ? 'Update' : 'Add'} Question</button>
      </form>

      {quiz && quiz.questions && quiz.questions.length > 0 ? (
        <div className="questions-list">
          {quiz.questions.map((question) => (
            <div key={question._id} className="question-card">
              <p className="question-text-display">{question.questionText}</p>
              <p className="options-display">Options: {question.options.join(', ')}</p>
              <p className="correct-answer-display">Correct Answer: {question.correctAnswer}</p>
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
