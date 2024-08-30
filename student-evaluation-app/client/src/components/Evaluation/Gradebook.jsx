// student-evaluation-app\client\src\components\Evaluation\Gradebook.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify'; // Import DOMPurify
import './Gradebook.css'; // Assuming you have a CSS file for styling
import URL from '../../backEndURL';

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

const Gradebook = ({ user }) => {
  const [grades, setGrades] = useState([]);
  const [details, setDetails] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStudentName, setCurrentStudentName] = useState({ firstName: '', lastName: '' });
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    const fetchEvaluations = async () => {
      try {
        const response = await axios.get(`${URL}/api/evaluations`);
        console.log('Fetched grades:', response.data);
        if (response.data.length > 0) {
          setGrades(response.data);

          // Extract the current student's first and last name based on user._id
          const currentStudentEvaluations = response.data.filter(grade => grade.presenter._id === user._id);
          if (currentStudentEvaluations.length > 0) {
            const { firstName, lastName } = currentStudentEvaluations[0].presenter;
            setCurrentStudentName({ firstName, lastName });
          }
        } else {
          console.log('No evaluations found');
          setErrorMessage('No evaluations found');
        }
      } catch (error) {
        console.error('Error fetching evaluations:', error);
        setErrorMessage('Error fetching evaluations');
      }
    };

    const fetchAreas = async () => {
      try {
        const response = await axios.get(`${URL}/api/areas`);
        console.log('Fetched areas:', response.data);
        const areasObject = response.data;
        const areasArray = Object.keys(areasObject).filter(key => key.startsWith('area')).map(key => ({
          key,
          name: areasObject[key]
        }));
        setAreas(areasArray);
      } catch (error) {
        console.error('Error fetching areas:', error);
        setErrorMessage('Error fetching areas');
      }
    };

    fetchEvaluations();
    fetchAreas();
  }, [user._id]);

  const toggleDetails = (username) => {
    setDetails((prevDetails) => ({
      ...prevDetails,
      [username]: !prevDetails[username],
    }));
  };

  const calculateFinalScore = (evaluations) => {
    const studentEvaluations = evaluations.filter(evaluation => evaluation.evaluator.role === 'student');
    const instructorEvaluations = evaluations.filter(evaluation => evaluation.evaluator.role === 'instructor');

    const totalStudentScore = studentEvaluations.reduce((total, evaluation) => {
      const score = evaluation.scores.area1 + evaluation.scores.area2 + evaluation.scores.area3 + evaluation.scores.area4 + evaluation.scores.extraCredit;
      return total + score;
    }, 0);

    const totalInstructorScore = instructorEvaluations.reduce((total, evaluation) => {
      const score = evaluation.scores.area1 + evaluation.scores.area2 + evaluation.scores.area3 + evaluation.scores.area4 + evaluation.scores.extraCredit;
      return total + score;
    }, 0);

    const studentCount = studentEvaluations.length;
    const instructorCount = instructorEvaluations.length;

    const studentFinalScore = studentCount > 0 ? (totalStudentScore / (studentCount * 25)) * 80 : 0;
    const instructorFinalScore = instructorCount > 0 ? (totalInstructorScore / (instructorCount * 25)) * 20 : 0;

    return studentFinalScore + instructorFinalScore;
  };

  const deleteEvaluation = (evaluationId) => {
    axios.delete(`${URL}/api/evaluations/${evaluationId}`)
      .then(response => {
        console.log(response.data.message);
        setGrades(grades.filter(grade => grade._id !== evaluationId)); // Remove deleted evaluation from state
      })
      .catch(error => {
        console.error('Error deleting evaluation:', error);
      });
  };

  const groupByPresenter = (grades) => {
    const grouped = {};
    grades.forEach(grade => {
      if (grade.presenter) {
        const presenterUsername = `${grade.presenter.firstName} ${grade.presenter.lastName}`;
        if (!grouped[presenterUsername]) {
          grouped[presenterUsername] = [];
        }
        grouped[presenterUsername].push(grade);
      }
    });
    return grouped;
  };

  const groupedGrades = groupByPresenter(grades);

  const studentGrades = grades.filter(grade => grade.presenter._id === user._id);

  return (
    <div className="gradebook">
      <h2>Gradebook</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {user.role === 'student' && studentGrades.length === 0 ? (
        <p>No evaluations found</p>
      ) : (
        <>
          {user.role === 'student' ? (
            studentGrades.length === 0 ? (
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
                  <tr>
                    <td className="student-column">{`${currentStudentName.firstName} ${currentStudentName.lastName}`}</td>
                    <td className="score-column">
                      {calculateFinalScore(studentGrades).toFixed(2)}%
                    </td>
                    <td>
                      <button onClick={() => toggleDetails(`${currentStudentName.firstName} ${currentStudentName.lastName}`)}>Toggle Details</button>
                      {details[`${currentStudentName.firstName} ${currentStudentName.lastName}`] && (
                        <div className="evaluation-details">
                          <h3>Evaluations</h3>
                          <div className="evaluation-cards">
                            {studentGrades.map((evaluation, evalIndex) => (
                              <div key={evalIndex} className="evaluation-card">
                                <strong>Evaluator:</strong> {evaluation.evaluator.username} ({evaluation.evaluator.role})<br />
                                <strong>Scores:</strong>
                                <div className="scores">
                                  {areas.map((area, index) => (
                                    <div key={index}>
                                      {area.name}: <StarDisplay value={evaluation.scores[area.key]} />
                                    </div>
                                  ))}
                                  <div>Extra Credit: <StarDisplay value={evaluation.scores.extraCredit} /></div>
                                </div>
                                <strong>Comments:</strong> <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(evaluation.comments.replace(/\n/g, '<br>')) }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            )
          ) : (
            Object.keys(groupedGrades).length === 0 ? (
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
                        <td className="score-column">{finalScore.toFixed(2)}%</td>
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
                                      {areas.map((area, index) => (
                                        <div key={index}>
                                          {area.name}: <StarDisplay value={evaluation.scores[area.key]} />
                                        </div>
                                      ))}
                                      <div>Extra Credit: <StarDisplay value={evaluation.scores.extraCredit} /></div>
                                    </div>
                                    <strong>Comments:</strong> <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(evaluation.comments.replace(/\n/g, '<br>')) }} />
                                    {user.role === 'instructor' && (
                                      <button onClick={() => deleteEvaluation(evaluation._id)}>Delete</button>
                                    )}
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
            )
          )}
        </>
      )}
    </div>
  );
};

export default Gradebook;
