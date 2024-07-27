import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EvaluationForm = () => {
  const [presenter, setPresenter] = useState('');
  const [evaluators, setEvaluators] = useState([]);
  const [scores, setScores] = useState({ area1: 0, area2: 0, area3: 0, area4: 0, extraCredit: 0 });
  const [comments, setComments] = useState('');

  useEffect(() => {
    // Fetch evaluators and other necessary data
    axios.get('http://localhost:5000/api/users')
      .then(response => setEvaluators(response.data))
      .catch(error => console.error(error));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const evaluator = localStorage.getItem('userId');
      const type = localStorage.getItem('role');
      await axios.post('http://localhost:5000/api/evaluations/submit', { presenter, evaluator, scores, comments, type });
      // Handle success
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Evaluation Form</h2>
      <form onSubmit={handleSubmit}>
        <label>Presenter:</label>
        <select value={presenter} onChange={(e) => setPresenter(e.target.value)} required>
          {evaluators.map(evaluator => (
            <option key={evaluator._id} value={evaluator._id}>
              {evaluator.firstName} {evaluator.lastName}
            </option>
          ))}
        </select>
        <label>Area 1:</label>
        <input type="number" value={scores.area1} onChange={(e) => setScores({ ...scores, area1: e.target.value })} required />
        <label>Area 2:</label>
        <input type="number" value={scores.area2} onChange={(e) => setScores({ ...scores, area2: e.target.value })} required />
        <label>Area 3:</label>
        <input type="number" value={scores.area3} onChange={(e) => setScores({ ...scores, area3: e.target.value })} required />
        <label>Area 4:</label>
        <input type="number" value={scores.area4} onChange={(e) => setScores({ ...scores, area4: e.target.value })} required />
        <label>Extra Credit:</label>
        <input type="number" value={scores.extraCredit} onChange={(e) => setScores({ ...scores, extraCredit: e.target.value })} required />
        <label>Comments:</label>
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} />
        <button type="submit">Submit Evaluation</button>
      </form>
    </div>
  );
};

export default EvaluationForm;
