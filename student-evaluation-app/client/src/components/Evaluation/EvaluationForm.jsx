/**
 * EvaluationForm.jsx
 * 
 * After submitting, we set a success message and then
 * manually reset the form fields to allow the next submission.
 * No full reload, so we don't lose 'user' data or risk being
 * redirected to login.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EvaluationForm.css';
import URL from '../../backEndURL';

const StarRating = ({ name, value, onChange }) => {
  const [hoverValue, setHoverValue] = useState(undefined);

  const handleClick = (val) => onChange(name, val);
  const handleMouseOver = (val) => setHoverValue(val);
  const handleMouseLeave = () => setHoverValue(undefined);

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((val) => (
        <span
          key={val}
          className={`star ${hoverValue >= val || value >= val ? 'filled' : ''}`}
          onClick={() => handleClick(val)}
          onMouseOver={() => handleMouseOver(val)}
          onMouseLeave={handleMouseLeave}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
};

const EvaluationForm = ({ user }) => {
  // For area definitions and presenters
  const [areas, setAreas] = useState([]);
  const [presenters, setPresenters] = useState([]);
  const [presenterId, setPresenterId] = useState('');

  // For scores and comments
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState('');

  // Feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load data on mount
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await axios.get(`${URL}/api/areas`);
        const areasObject = res.data || {};
        const areasArray = Object.keys(areasObject)
          .filter(k => k.startsWith('area'))
          .map(k => ({ key: k, name: areasObject[k] }));

        setAreas(areasArray);

        // Initialize scores
        const initialScores = { extraCredit: 0 };
        areasArray.forEach(area => {
          initialScores[area.key] = 0;
        });
        setScores(initialScores);
      } catch (err) {
        console.error('Error fetching areas:', err);
        setErrorMessage('Error fetching areas');
      }
    };

    const fetchPresenters = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(`${URL}/api/users/students`, config);
        setPresenters(res.data);
      } catch (err) {
        console.error('Error fetching presenters:', err);
        setErrorMessage('Error fetching presenters');
      }
    };

    fetchAreas();
    fetchPresenters();
  }, [user]);

  // Handle star rating changes
  const handleScoreChange = (areaKey, value) => {
    setScores((prev) => ({ ...prev, [areaKey]: value }));
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!user || !user._id) {
      setErrorMessage('User is not defined.');
      return;
    }

    // Adjust field names if your server expects "presenter" instead of "presenterId"
    const evaluationBody = {
      presenterId,
      evaluatorId: user._id,
      scores,
      comments,
      type: user.role,
    };

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post(`${URL}/api/evaluations/submit`, evaluationBody, config);
      setSuccessMessage('Evaluation submitted successfully!');

      // Manually reset form fields
      setPresenterId('');
      setComments('');
      setScores((prev) => {
        const reset = {};
        for (let key in prev) {
          reset[key] = 0;
        }
        return reset;
      });

      // If you want the message to disappear after a short delay:
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
      // We do NOT call window.location.reload() or navigate
      // to avoid losing 'user' state and forcing a login page load.

    } catch (err) {
      console.error('Error submitting evaluation:', err);
      setErrorMessage('Error submitting evaluation');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Evaluation Form</h2>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label><strong>Presenter:</strong></label>
          <select
            value={presenterId}
            onChange={(e) => setPresenterId(e.target.value)}
            required
            style={{ marginLeft: '10px' }}
          >
            <option value="">Select Presenter</option>
            {presenters.map((p) => (
              <option key={p._id} value={p._id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px' }}>Criteria</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Rating (Stars)</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((areaObj) => (
              <tr key={areaObj.key}>
                <td style={{ padding: '8px' }}>{areaObj.name}</td>
                <td style={{ padding: '8px' }}>
                  <StarRating
                    name={areaObj.key}
                    value={scores[areaObj.key] || 0}
                    onChange={handleScoreChange}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '8px' }}>Did you learn something new?</td>
              <td style={{ padding: '8px' }}>
                <StarRating
                  name="extraCredit"
                  value={scores.extraCredit || 0}
                  onChange={handleScoreChange}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '15px' }}>
          <label><strong>Comments:</strong></label><br />
          <textarea
            rows={4}
            style={{ width: '100%', marginTop: '5px' }}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        <button
          type="submit"
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Submit Evaluation
        </button>
      </form>
    </div>
  );
};

export default EvaluationForm;
