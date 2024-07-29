import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Gradebook.css'; // Assuming you have a CSS file for styling

const StarDisplay = ({ value }) => {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((val) => (
        <span key={val} className={`star ${value >= val ? 'filled' : ''}`}>
          &#9733;
        </span>
      ))}
    </div>
  );
};

const Gradebook = () => {
  const [grades, setGrades] = useState([]);
  const [details, setDetails] = useState({});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/api/evaluations')
      .then(response => {
        console.log('Fetched grades:', response.data);
        if (response.data.length > 0) {
          setGrades(response.data);
        } else {
          console.log('No evaluations found');
          setErrorMessage('No evaluations found');
        }
      })
      .catch(error => {
        console.error('Error fetching evaluations:', error);
        setErrorMessage('Error fetching evaluations');
      });
  }, []);

  const toggleDetails = (username) => {
    setDetails((prevDetails) => ({
      ...prevDetails,
      [username]: !prevDetails[username],
    }));
  };

  const calculateFinalScore = (evaluations) => {
    const totalScore = evaluations.reduce((total, evaluation) => {
      const score = evaluation.scores.area1 + evaluation.scores.area2 + evaluation.scores.area3 + evaluation.scores.area4 + evaluation.scores.extraCredit;
      return total + score;
    }, 0);
    return totalScore;
  };

  const groupByPresenter = (grades) => {
    const grouped = {};
    grades.forEach(grade => {
      const presenterUsername = grade.presenter.firstName +" "+ grade.presenter.lastName;
      if (!grouped[presenterUsername]) {
        grouped[presenterUsername] = [];
      }
      grouped[presenterUsername].push(grade);
    });
    return grouped;
  };

  const groupedGrades = groupByPresenter(grades);

  return (
    <div className="gradebook">
      <h2>Gradebook</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {Object.keys(groupedGrades).length === 0 ? (
        <p>No evaluations found</p>
      ) : (
        <table className="gradebook-table">
          <thead>
            <tr>
              <th className="student-column">Student</th>
              <th className="score-column">Final Score</th>
              <th>Breakdown</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupedGrades).map((presenterUsername, index) => {
              const evaluations = groupedGrades[presenterUsername];
              const finalScore = calculateFinalScore(evaluations);
              return (
                <tr key={index}>
                  <td className="student-column">{presenterUsername}</td>
                  <td className="score-column">{finalScore}</td>
                  <td>
                    <button onClick={() => toggleDetails(presenterUsername)}>Toggle Details</button>
                    {details[presenterUsername] && (
                      <div className="evaluation-details">
                        <h3>Evaluations</h3>
                        <div className="evaluation-cards">
                          {evaluations.map((evaluation, evalIndex) => (
                            <div key={evalIndex} className="evaluation-card">
                              <strong>Evaluator:</strong> {evaluation.evaluator.username} ({evaluation.evaluator.role})<br />
                              <strong>Scores:</strong>
                              <div className="scores">
                                <div>Area 1: <StarDisplay value={evaluation.scores.area1} /></div>
                                <div>Area 2: <StarDisplay value={evaluation.scores.area2} /></div>
                                <div>Area 3: <StarDisplay value={evaluation.scores.area3} /></div>
                                <div>Area 4: <StarDisplay value={evaluation.scores.area4} /></div>
                                <div>Extra Credit: <StarDisplay value={evaluation.scores.extraCredit} /></div>
                              </div>
                              <strong>Comments:</strong> {evaluation.comments}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Gradebook;
