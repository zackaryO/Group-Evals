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
  // Instructor-only filter controls.
  const [cohortFilter, setCohortFilter] = useState('all'); // 'all' | 'active' | 'inactive' | <cohortId>
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'cohort' | 'score'
  const isInstructorView = user.role === 'instructor' || user.role === 'admin';

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
        const areasArray = Object.keys(areasObject)
          .filter(key => key.startsWith('area'))
          .map(key => ({
            key,
            name: areasObject[key],
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
    if (evaluations.length === 0) {
      return 0;
    }
    let totalScore = 0;

    evaluations.forEach((evaluation) => {
      const score =
        evaluation.scores.area1 +
        evaluation.scores.area2 +
        evaluation.scores.area3 +
        evaluation.scores.area4 +
        evaluation.scores.extraCredit;
      totalScore += score;
    });

    // Calculate the overall score as a percentage out of 25 points, with extra credit included
    const possiblePoints = evaluations.length * 25;
    return (totalScore / possiblePoints) * 100;
  };

  const deleteEvaluation = (evaluationId) => {
    axios
      .delete(`${URL}/api/evaluations/${evaluationId}`)
      .then((response) => {
        console.log(response.data.message);
        setGrades(grades.filter((grade) => grade._id !== evaluationId)); // Remove deleted evaluation from state
      })
      .catch((error) => {
        console.error('Error deleting evaluation:', error);
      });
  };

  const groupByPresenter = (grades) => {
    const grouped = {};
    grades.forEach((grade) => {
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

  // Build the unique list of cohorts referenced by any presenter so the
  // instructor's filter dropdown matches the data actually on screen.
  const cohortOptions = (() => {
    const seen = new Map();
    grades.forEach((g) => {
      const c = g.presenter && g.presenter.cohort;
      if (c && c._id) seen.set(String(c._id), c);
    });
    return Array.from(seen.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  })();

  const presenterMatchesCohortFilter = (presenter) => {
    if (cohortFilter === 'all') return true;
    const cohort = presenter && presenter.cohort;
    const cohortActive = cohort ? cohort.isActive !== false : true;
    const studentActive = presenter ? presenter.isActive !== false : true;
    if (cohortFilter === 'active') return cohortActive && studentActive;
    if (cohortFilter === 'inactive') return !cohortActive || !studentActive;
    return cohort && String(cohort._id) === String(cohortFilter);
  };

  const filteredGrades = isInstructorView
    ? grades.filter((g) => presenterMatchesCohortFilter(g.presenter))
    : grades;

  const groupedGrades = groupByPresenter(filteredGrades);

  // Sort the row keys (presenter display names) per instructor's pick.
  const sortedPresenterKeys = (() => {
    const keys = Object.keys(groupedGrades);
    if (sortBy === 'score') {
      keys.sort((a, b) => calculateFinalScore(groupedGrades[b]) - calculateFinalScore(groupedGrades[a]));
    } else if (sortBy === 'cohort') {
      keys.sort((a, b) => {
        const aCohort = groupedGrades[a][0]?.presenter?.cohort?.name || '';
        const bCohort = groupedGrades[b][0]?.presenter?.cohort?.name || '';
        if (aCohort === bCohort) return a.localeCompare(b);
        return aCohort.localeCompare(bCohort);
      });
    } else {
      keys.sort((a, b) => a.localeCompare(b));
    }
    return keys;
  })();

  const isPresenterInactive = (presenter) => {
    if (!presenter) return false;
    const studentInactive = presenter.isActive === false;
    const cohortInactive = presenter.cohort && presenter.cohort.isActive === false;
    return studentInactive || cohortInactive;
  };

  const studentGrades = grades.filter((grade) => grade.presenter._id === user._id);

  return (
    <div className="gradebook">
      <h2>Gradebook</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {isInstructorView && (
        <div className="gradebook-filters" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <label style={{ fontSize: 13 }}>
            Cohort:&nbsp;
            <select value={cohortFilter} onChange={(e) => setCohortFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
              {cohortOptions.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}{c.isActive === false ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            Sort:&nbsp;
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Name</option>
              <option value="cohort">Cohort</option>
              <option value="score">Score (high to low)</option>
            </select>
          </label>
        </div>
      )}
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
                    <td className="student-column">
                      {`${currentStudentName.firstName} ${currentStudentName.lastName}`}
                    </td>
                    <td className="score-column">
                      {calculateFinalScore(studentGrades).toFixed(2)}%
                    </td>
                    <td>
                      <button
                        onClick={() =>
                          toggleDetails(
                            `${currentStudentName.firstName} ${currentStudentName.lastName}`
                          )
                        }
                      >
                        Toggle Details
                      </button>
                      {details[`${currentStudentName.firstName} ${currentStudentName.lastName}`] && (
                        <div className="evaluation-details">
                          <h3>Evaluations</h3>
                          <div className="evaluation-cards">
                            {studentGrades.map((evaluation, evalIndex) => (
                              <div key={evalIndex} className="evaluation-card">
                                <strong>Evaluator:</strong> {evaluation.evaluator.firstName}{' '}
                                {evaluation.evaluator.lastName} ({evaluation.evaluator.role})
                                <br />
                                <strong>Score:</strong>{' '}
                                {(
                                  ((evaluation.scores.area1 +
                                    evaluation.scores.area2 +
                                    evaluation.scores.area3 +
                                    evaluation.scores.area4 +
                                    evaluation.scores.extraCredit) /
                                    25) *
                                  100
                                ).toFixed(2)}
                                %
                                <br />
                                <strong>Scores:</strong>
                                <div className="scores">
                                  {areas.map((area, index) => (
                                    <div className="score-item" key={index}>
                                      <span className="area-name">{area.name}:</span>
                                      <StarDisplay value={evaluation.scores[area.key]} />
                                    </div>
                                  ))}
                                  <div className="score-item">
                                    <span className="area-name">Did you learn something new?</span>
                                    <StarDisplay value={evaluation.scores.extraCredit} />
                                  </div>
                                </div>
                                <strong>Comments:</strong>{' '}
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(
                                      evaluation.comments.replace(/\n/g, '<br>')
                                    ),
                                  }}
                                />
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
          ) : sortedPresenterKeys.length === 0 ? (
            <p>No evaluations found</p>
          ) : (
            <table className="gradebook-table">
              <thead>
                <tr>
                  <th className="student-column">Student</th>
                  <th>Cohort</th>
                  <th className="score-column">Final Score</th>
                  <th>Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {sortedPresenterKeys.map((presenterUsername, index) => {
                  const evaluations = groupedGrades[presenterUsername];
                  const finalScore = calculateFinalScore(evaluations);
                  const presenter = evaluations[0]?.presenter;
                  const cohort = presenter?.cohort;
                  const inactive = isPresenterInactive(presenter);
                  const rowStyle = inactive ? { opacity: 0.55, color: '#6b7280' } : undefined;

                  return (
                    <tr key={index} style={rowStyle}>
                      <td className="student-column">
                        {presenterUsername}
                        {inactive ? ' (inactive)' : ''}
                      </td>
                      <td>{cohort?.name || '—'}</td>
                      <td className="score-column">{finalScore.toFixed(2)}%</td>
                      <td>
                        <button onClick={() => toggleDetails(presenterUsername)}>
                          Toggle Details
                        </button>
                        {details[presenterUsername] && (
                          <div className="evaluation-details">
                            <h3>Evaluations</h3>
                            <div className="evaluation-cards">
                              {evaluations.map((evaluation, evalIndex) => (
                                <div key={evalIndex} className="evaluation-card">
                                  <strong>Evaluator:</strong> {evaluation.evaluator.firstName}{' '}
                                  {evaluation.evaluator.lastName} ({evaluation.evaluator.role})
                                  <br />
                                  <strong>Score:</strong>{' '}
                                  {(
                                    ((evaluation.scores.area1 +
                                      evaluation.scores.area2 +
                                      evaluation.scores.area3 +
                                      evaluation.scores.area4 +
                                      evaluation.scores.extraCredit) /
                                      25) *
                                    100
                                  ).toFixed(2)}
                                  %
                                  <br />
                                  <strong>Scores:</strong>
                                  <div className="scores">
                                    {areas.map((area, index) => (
                                      <div className="score-item" key={index}>
                                        <span className="area-name">{area.name}:</span>
                                        <StarDisplay value={evaluation.scores[area.key]} />
                                      </div>
                                    ))}
                                    <div className="score-item">
                                      <span className="area-name">Did you learn something new?</span>
                                      <StarDisplay value={evaluation.scores.extraCredit} />
                                    </div>
                                  </div>
                                  <strong>Comments:</strong>{' '}
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: DOMPurify.sanitize(
                                        evaluation.comments.replace(/\n/g, '<br>')
                                      ),
                                    }}
                                  />
                                  {user.role === 'instructor' && (
                                    <button onClick={() => deleteEvaluation(evaluation._id)}>
                                      Delete
                                    </button>
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
          )}
        </>
      )}
    </div>
  );
};

export default Gradebook;
