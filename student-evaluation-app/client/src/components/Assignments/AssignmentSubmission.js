// student-evaluation-app/client/src/components/Assignments/AssignmentSubmission.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import { useParams } from 'react-router-dom';

const AssignmentSubmission = ({ user }) => {
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [submissionText, setSubmissionText] = useState('');
  const [message, setMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const response = await axios.get(`${URL}/api/assignments/${assignmentId}`);
        const assignmentData = response.data;
        setAssignment(assignmentData);

        // Check if the assignment is locked
        const currentDate = new Date();
        const dueDate = new Date(assignmentData.dueDate);
        if (currentDate > dueDate && !assignmentData.allowLateSubmission) {
          setIsLocked(true);
          setMessage('This assignment is closed for submissions.');
        }
      } catch (error) {
        setMessage('Error fetching assignment: ' + error.message);
      }
    };
    fetchAssignment();
  }, [assignmentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${URL}/api/assignments/${assignmentId}/submit`, {
        studentId: user._id,
        content: submissionText,
      });
      setMessage('Assignment submitted successfully!');
      setSubmissionText('');
    } catch (error) {
      setMessage('Error submitting assignment: ' + error.message);
    }
  };

  if (!assignment) {
    return <p>Loading assignment...</p>;
  }

  return (
    <div className="assignment-submission-container">
      <h2>{assignment.title}</h2>
      <p>{assignment.description}</p>
      {message && <p>{message}</p>}
      {!isLocked ? (
        <form onSubmit={handleSubmit}>
          <label>
            Your Submission:
            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              required
            />
          </label>
          <button type="submit">Submit Assignment</button>
        </form>
      ) : (
        <p>You cannot submit this assignment.</p>
      )}
    </div>
  );
};

export default AssignmentSubmission;
