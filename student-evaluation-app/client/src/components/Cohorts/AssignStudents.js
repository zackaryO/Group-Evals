// student-evaluation-app/client/src/components/Cohorts/AssignStudents.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const AssignStudents = () => {
  const [students, setStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchStudentsAndCohorts = async () => {
      try {
        const [studentsRes, cohortsRes] = await Promise.all([
          axios.get(`${URL}/api/users/students`),
          axios.get(`${URL}/api/cohorts`),
        ]);
        setStudents(studentsRes.data);
        setCohorts(cohortsRes.data);
      } catch (error) {
        setMessage('Error fetching data: ' + error.message);
      }
    };
    fetchStudentsAndCohorts();
  }, []);

  const handleAssign = async (studentId) => {
    try {
      await axios.put(`${URL}/api/users/${studentId}/assign-cohort`, {
        cohortId: selectedCohort,
      });
      setMessage('Student assigned to cohort successfully.');
    } catch (error) {
      setMessage('Error assigning student: ' + error.message);
    }
  };

  return (
    <div className="assign-students-container">
      <h2>Assign Students to Cohorts</h2>
      {message && <p>{message}</p>}
      <label>
        Select Cohort:
        <select
          value={selectedCohort}
          onChange={(e) => setSelectedCohort(e.target.value)}
          required
        >
          <option value="">--Select Cohort--</option>
          {cohorts.map((cohort) => (
            <option key={cohort._id} value={cohort._id}>
              {cohort.name}
            </option>
          ))}
        </select>
      </label>
      {students.length > 0 ? (
        <ul>
          {students.map((student) => (
            <li key={student._id}>
              <p>
                {student.firstName} {student.lastName} ({student.username})
              </p>
              <button onClick={() => handleAssign(student._id)}>
                Assign to Cohort
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No students available.</p>
      )}
    </div>
  );
};

export default AssignStudents;
