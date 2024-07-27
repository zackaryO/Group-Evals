import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Gradebook = () => {
  const [grades, setGrades] = useState([]);
  const [details, setDetails] = useState({});

  useEffect(() => {
    // Fetch grades
    axios.get('http://localhost:5000/api/evaluations')
      .then(response => {
        if (response.data.length > 0) {
          setGrades(response.data);
        } else {
          console.log('No evaluations found');
        }
      })
      .catch(error => console.error(error));
  }, []);

  const toggleDetails = (username) => {
    setDetails((prevDetails) => ({
      ...prevDetails,
      [username]: !prevDetails[username],
    }));
  };

  return (
    <div>
      <h2>Gradebook</h2>
      {grades.length === 0 ? (
        <p>No evaluations found</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Final Score</th>
              <th>Breakdown</th>
            </tr>
          </thead>
          <tbody>
            {grades.map(grade => (
              <tr key={grade.username}>
                <td>{grade.username}</td>
                <td>{grade.finalScore}</td>
                <td>
                  <button onClick={() => toggleDetails(grade.username)}>Toggle Details</button>
                  {details[grade.username] && (
                    <div>
                      <h3>Peer Evaluations</h3>
                      <ul>
                        {grade.peerScores.map(peerScore => (
                          <li key={peerScore.evaluator}>Evaluator: {peerScore.evaluator} - Score: {peerScore.score}</li>
                        ))}
                      </ul>
                      <h3>Instructor Evaluations</h3>
                      <ul>
                        {grade.instructorScores.map(instructorScore => (
                          <li key={instructorScore.evaluator}>Evaluator: {instructorScore.evaluator} - Score: {instructorScore.score}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Gradebook;
