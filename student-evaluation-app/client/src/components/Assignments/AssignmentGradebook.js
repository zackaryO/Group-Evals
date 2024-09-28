// student-evaluation-app/client/src/components/Assignments/AssignmentGradebook.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import { useParams } from 'react-router-dom';

const AssignmentGradebook = ({ user }) => {
  const { assignmentId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [message, setMessage] = useState('');
  const [assignment, setAssignment] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const [assignmentRes, submissionsRes] = await Promise.all([
          axios.get(`${URL}/api/assignments/${assignmentId}`),
          axios.get(`${URL}/api/assignments/${assignmentId}/submissions`),
        ]);
        setAssignment(assignmentRes.data);
        setSubmissions(submissionsRes.data);
      } catch (error) {
        setMessage('Error fetching data: ' + error.message);
      }
    };
    fetchSubmissions();
  }, [assignmentId]);

  const handleGrade = async (submissionId, grade) => {
    try {
      await axios.put(`${URL}/api/assignments/${assignmentId}/grade/${submissionId}`, {
        grade,
      });
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub._id === submissionId ? { ...sub, grade } : sub
        )
      );
      setMessage('Grade updated successfully.');
    } catch (error) {
      setMessage('Error grading submission: ' + error.message);
    }
  };

  return (
    <div className="assignment-gradebook-container">
      <h2>Assignment Gradebook: {assignment ? assignment.title : 'Loading...'}</h2>
      {message && <p>{message}</p>}
      {submissions.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Submission</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission._id}>
                <td>
                  {submission.student.firstName} {submission.student.lastName}
                </td>
                <td>{submission.content}</td>
                <td>
                  <input
                    type="number"
                    value={submission.grade || ''}
                    onChange={(e) =>
                      handleGrade(submission._id, e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No submissions available.</p>
      )}
    </div>
  );
};

export default AssignmentGradebook;
