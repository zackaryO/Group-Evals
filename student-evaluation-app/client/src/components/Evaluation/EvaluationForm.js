import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EvaluationForm = ({ user }) => {
  const [areas, setAreas] = useState([]);
  const [presenter, setPresenter] = useState('');
  const [presenters, setPresenters] = useState([]);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    console.log('User in EvaluationForm useEffect:', user); // Log the user object

    const fetchAreas = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/areas');
        console.log('Fetched areas:', response.data);  // Log the fetched areas
        const areasObject = response.data;
        const areasArray = Object.keys(areasObject).filter(key => key.startsWith('area')).map(key => ({
          key,
          name: areasObject[key]
        }));
        setAreas(areasArray);

        // Initialize scores state based on fetched areas
        const initialScores = {};
        areasArray.forEach(area => {
          initialScores[area.key] = 0;
        });
        setScores(initialScores);
      } catch (error) {
        console.error('Error fetching areas:', error);
        setErrorMessage('Error fetching areas');
      }
    };

    const fetchPresenters = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/users/students');
        console.log('Fetched presenters:', response.data);  // Log the fetched presenters
        setPresenters(response.data);
      } catch (error) {
        console.error('Error fetching presenters:', error);
        setErrorMessage('Error fetching presenters');
      }
    };

    fetchAreas();
    fetchPresenters();
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!user || !user._id) {
      setErrorMessage('User is not defined');
      return;
    }

    console.log('Submitting evaluation with user:', user);  // Log the user object

    const evaluation = {
      presenter,
      evaluator: user._id,
      scores,
      comments,
      type: user.role
    };

    axios.post('http://localhost:5000/api/evaluations/submit', evaluation)
      .then(response => {
        console.log('Evaluation submitted successfully');
        navigate('/gradebook');
      })
      .catch(error => {
        console.error('Error submitting evaluation:', error);
        setErrorMessage('Error submitting evaluation');
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Evaluation Form</h2>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      <label>
        Presenter:
        <select value={presenter} onChange={(e) => setPresenter(e.target.value)} required>
          <option value="">Select Presenter</option>
          {presenters.map((presenter) => (
            <option key={presenter._id} value={presenter._id}>
              {presenter.firstName} {presenter.lastName}
            </option>
          ))}
        </select>
      </label>
      {areas.map((area, index) => (
        <label key={index}>
          {area.name}:
          <input
            type="number"
            value={scores[area.key]}
            onChange={(e) => setScores({ ...scores, [area.key]: e.target.value })}
            required
          />
        </label>
      ))}
      <label>
        Extra Credit:
        <input
          type="number"
          value={scores.extraCredit || 0}
          onChange={(e) => setScores({ ...scores, extraCredit: e.target.value })}
          required
        />
      </label>
      <label>
        Comments:
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </label>
      <button type="submit">Submit Evaluation</button>
    </form>
  );
};

export default EvaluationForm;
