import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const EvaluationForm = ({ user }) => {
  const [areas, setAreas] = useState({});
  const [presenter, setPresenter] = useState('');
  const [scores, setScores] = useState({
    area1: 0,
    area2: 0,
    area3: 0,
    area4: 0,
    extraCredit: 0
  });
  const [comments, setComments] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    // Fetch the defined areas from the server
    axios.get('/api/areas')
      .then(response => {
        setAreas(response.data);
      })
      .catch(error => {
        console.error('Error fetching areas:', error);
      });
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    const evaluation = {
      presenter,
      evaluator: user._id,
      scores,
      comments,
      type: user.role
    };

    axios.post('/api/evaluations/submit', evaluation)
      .then(response => {
        console.log('Evaluation submitted successfully');
        navigate('/gradebook');
      })
      .catch(error => {
        console.error('Error submitting evaluation:', error);
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Evaluation Form</h2>
      <label>
        Presenter:
        <input
          type="text"
          value={presenter}
          onChange={(e) => setPresenter(e.target.value)}
          required
        />
      </label>
      <label>
        Area 1:
        <input
          type="number"
          value={scores.area1}
          onChange={(e) => setScores({ ...scores, area1: e.target.value })}
          required
        />
      </label>
      <label>
        Area 2:
        <input
          type="number"
          value={scores.area2}
          onChange={(e) => setScores({ ...scores, area2: e.target.value })}
          required
        />
      </label>
      <label>
        Area 3:
        <input
          type="number"
          value={scores.area3}
          onChange={(e) => setScores({ ...scores, area3: e.target.value })}
          required
        />
      </label>
      <label>
        Area 4:
        <input
          type="number"
          value={scores.area4}
          onChange={(e) => setScores({ ...scores, area4: e.target.value })}
          required
        />
      </label>
      <label>
        Extra Credit:
        <input
          type="number"
          value={scores.extraCredit}
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
