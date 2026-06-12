// student-evaluation-app/client/src/components/Quizzes/CreateQuiz.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import URL from '../../backEndURL';
import './CreateQuiz.css'; // Import the CSS

const CreateQuiz = ({ user }) => {
  const [title, setTitle] = useState('');
  const [allowMultipleSubmissions, setAllowMultipleSubmissions] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${URL}/api/quizzes/create`,
        { title, instructorId: user._id, allowMultipleSubmissions },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage(`Quiz "${response.data.title}" created successfully!`);
      setTitle('');
      setAllowMultipleSubmissions(false);
      // Send the instructor straight to the new quiz's question manager so they
      // can start adding questions immediately.
      if (response.data?._id) {
        navigate(`/manage-questions/${response.data._id}`);
      }
    } catch (error) {
      setMessage('Error creating quiz: ' + error.message);
    }
  };

  return (
    <div className="create-quiz-container">
      <h2>Create a New Quiz</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleCreateQuiz}>
        <label>
          Quiz Title:
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Allow Multiple Submissions:
          <input type="checkbox" checked={allowMultipleSubmissions} onChange={(e) => setAllowMultipleSubmissions(e.target.checked)} />
        </label>
        <button type="submit">Create Quiz</button>
      </form>
    </div>
  );
};

export default CreateQuiz;
