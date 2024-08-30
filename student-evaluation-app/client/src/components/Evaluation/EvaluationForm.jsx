//student-evaluation-app\client\src\components\Evaluation\EvaluationForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './EvaluationForm.css'; // Assuming you have a CSS file for styling
import URL from '../../backEndURL';

const StarRating = ({ name, value, onChange }) => {
  const [hoverValue, setHoverValue] = useState(undefined);

  const handleClick = (val) => {
    onChange(name, val);
  };

  const handleMouseOver = (val) => {
    setHoverValue(val);
  };

  const handleMouseLeave = () => {
    setHoverValue(undefined);
  };

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
  const [areas, setAreas] = useState([]);
  const [presenter, setPresenter] = useState('');
  const [presenters, setPresenters] = useState([]);
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    console.log('User in EvaluationForm useEffect:', user);

    const fetchAreas = async () => {
      try {
        const response = await axios.get(`${URL}/api/areas`);
        //const response = await axios.get('http://localhost:5000/api/areas');
        console.log('Fetched areas:', response.data);
        const areasObject = response.data;
        const areasArray = Object.keys(areasObject).filter(key => key.startsWith('area')).map(key => ({
          key,
          name: areasObject[key]
        }));
        setAreas(areasArray);

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
        const response = await axios.get(`${URL}/api/users/students`);
       //const response = await axios.get('http://localhost:5000/api/users/students');        
        console.log('Fetched presenters:', response.data);
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

    console.log('Submitting evaluation with user:', user);

    const evaluation = {
      presenter,
      evaluator: user._id,
      scores,
      comments,
      type: user.role
    };

    axios.post(`${URL}/api/evaluations/submit`, evaluation)
    //axios.post('http://localhost:5000/api/evaluations/submit', evaluation)      
      .then(response => {
        console.log('Evaluation submitted successfully');
        navigate('/gradebook');
      })
      .catch(error => {
        console.error('Error submitting evaluation:', error);
        setErrorMessage('Error submitting evaluation');
      });
  };

  const handleScoreChange = (area, value) => {
    setScores({ ...scores, [area]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="evaluation-form">
      <h2>Evaluation Form</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
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
        <div key={index} className="area-rating">
          <label>{area.name}:</label>
          <StarRating name={area.key} value={scores[area.key]} onChange={handleScoreChange} />
        </div>
      ))}
      <label>
        Extra Credit:
        <StarRating name="extraCredit" value={scores.extraCredit || 0} onChange={handleScoreChange} />
      </label>
      <label>
        Comments:
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="comments-textarea"
        />
      </label>
      <button type="submit" className="submit-button">Submit Evaluation</button>
    </form>
  );
};

export default EvaluationForm;
