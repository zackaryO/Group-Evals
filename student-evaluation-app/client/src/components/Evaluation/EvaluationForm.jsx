/**
 * EvaluationForm.jsx
 *
 * This component lets a user (student or instructor) submit an evaluation of a selected student (presenter).
 * It uses a table so that "Extra Credit" is in the same star-rating column as other areas.
 * It sends fields as "presenterId" and "evaluatorId" to match your server's schema.
 * 
 * On success, it shows a success message and refreshes the page after 2s.
 * If your server actually expects "presenter" and "evaluator", revert to those names.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EvaluationForm.css';  // Custom CSS (optional)
import URL from '../../backEndURL'; // Make sure it points to your backend base URL

// Simple star-rating subcomponent
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
  // Data lists
  const [areas, setAreas] = useState([]);         // [{ key: 'area1', name: 'Content' }, ...]
  const [presenters, setPresenters] = useState([]); // array of student objects
  const [presenterId, setPresenterId] = useState(''); // which presenter is selected?

  // Scores object -> { area1: number, area2: number, area3: number, area4: number, extraCredit: number }
  const [scores, setScores] = useState({});

  // Comments & user feedback
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Fetch evaluation areas & presenters on mount.
   */
  useEffect(() => {
    // Fetch area definitions
    const fetchAreas = async () => {
      try {
        const res = await axios.get(`${URL}/api/areas`);
        // res.data might be { area1: "Content", area2: "Delivery", area3: "Slides", area4: "Q&A" }
        const areasObject = res.data || {};
        // Convert object -> array
        const areasArray = Object.keys(areasObject)
          .filter((key) => key.startsWith('area'))
          .map((key) => ({ key, name: areasObject[key] }));

        setAreas(areasArray);

        // Initialize scores with 0, plus extraCredit
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

    // Fetch student users for "presenters"
    const fetchPresenters = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
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

  /**
   * Handle star rating changes for a specific area or "extraCredit".
   */
  const handleScoreChange = (areaKey, rating) => {
    setScores((prevScores) => ({
      ...prevScores,
      [areaKey]: rating,
    }));
  };

  /**
   * Submit the evaluation to the backend.
   * We assume your server expects "presenterId" & "evaluatorId".
   * If it wants "presenter" & "evaluator", rename below accordingly.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Check for valid user
    if (!user || !user._id) {
      setErrorMessage('User is not defined.');
      return;
    }

    // Build request body. (Change to "presenter" if server wants that.)
    const evaluationBody = {
      presenterId,        // presenting student's _id
      evaluatorId: user._id, // the current user making the evaluation
      scores,
      comments,
      type: user.role,
    };

    try {
      // Must include token in request if your server requires auth
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post(`${URL}/api/evaluations/submit`, evaluationBody, config);

      setSuccessMessage('Evaluation submitted successfully!');
      // Reset form for next evaluation
      setPresenterId('');
      setComments('');
      setScores((prevScores) => {
        const resetScores = {};
        for (let key in prevScores) {
          resetScores[key] = 0;
        }
        return resetScores;
      });

      // Refresh after 2 seconds, so user sees success message
      // setTimeout(() => {
      //   window.location.reload();
      // }, 2000);

    } catch (err) {
      console.error('Error submitting evaluation:', err);
      setErrorMessage('Error submitting evaluation');
    }
  };

  return (
    <div className="evaluation-form-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Evaluation Form</h2>

      {/* Error or success messages */}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}

      <form onSubmit={handleSubmit}>

        {/* Presenter selection */}
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

        {/* Table for area alignment */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px' }}>Criteria</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Rating (Stars)</th>
            </tr>
          </thead>
          <tbody>
            {/* Render each "area" row */}
            {areas.map((areaObj) => (
              <tr key={areaObj.key}>
                <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                  {areaObj.name}
                </td>
                <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                  <StarRating
                    name={areaObj.key}
                    value={scores[areaObj.key] || 0}
                    onChange={handleScoreChange}
                  />
                </td>
              </tr>
            ))}

            {/* Extra credit row */}
            <tr>
              <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                Did you learn something new?
              </td>
              <td style={{ padding: '8px', verticalAlign: 'middle' }}>
                <StarRating
                  name="extraCredit"
                  value={scores.extraCredit || 0}
                  onChange={handleScoreChange}
                />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Comments */}
        <div style={{ marginTop: '15px' }}>
          <label><strong>Comments:</strong></label><br />
          <textarea
            rows={4}
            style={{ width: '100%', marginTop: '5px' }}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Submit Evaluation
        </button>
      </form>
    </div>
  );
};

export default EvaluationForm;
