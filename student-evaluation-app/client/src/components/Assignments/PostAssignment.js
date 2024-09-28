// student-evaluation-app/client/src/components/Assignments/PostAssignment.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const PostAssignment = ({ user }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [allowLateSubmission, setAllowLateSubmission] = useState(true);
  const [latePenalty, setLatePenalty] = useState(0);
  const [cohorts, setCohorts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCohortsAndCourses = async () => {
      try {
        const [cohortsRes, coursesRes] = await Promise.all([
          axios.get(`${URL}/api/cohorts`),
          axios.get(`${URL}/api/courses`),
        ]);
        setCohorts(cohortsRes.data);
        setCourses(coursesRes.data);
      } catch (error) {
        setMessage('Error fetching data: ' + error.message);
      }
    };
    fetchCohortsAndCourses();
  }, []);

  const handlePostAssignment = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${URL}/api/assignments`, {
        title,
        description,
        dueDate,
        allowLateSubmission,
        latePenalty,
        cohort: cohortId,
        course: courseId,
        createdBy: user._id,
      });
      setMessage(`Assignment "${response.data.title}" posted successfully!`);
      // Reset form fields
      setTitle('');
      setDescription('');
      setCohortId('');
      setCourseId('');
      setDueDate('');
      setAllowLateSubmission(true);
      setLatePenalty(0);
    } catch (error) {
      setMessage('Error posting assignment: ' + error.message);
    }
  };

  return (
    <div className="post-assignment-container">
      <h2>Post a New Assignment</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handlePostAssignment}>
        <label>
          Assignment Title:
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label>
          Description:
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Assign to Cohort:
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
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
        <label>
          Assign to Course (Optional):
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          >
            <option value="">--Select Course--</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due Date:
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </label>
        <label>
          Allow Late Submission:
          <input
            type="checkbox"
            checked={allowLateSubmission}
            onChange={(e) => setAllowLateSubmission(e.target.checked)}
          />
        </label>
        {allowLateSubmission && (
          <label>
            Late Penalty (% per day):
            <input
              type="number"
              value={latePenalty}
              onChange={(e) => setLatePenalty(e.target.value)}
              min="0"
            />
          </label>
        )}
        <button type="submit">Post Assignment</button>
      </form>
    </div>
  );
};

export default PostAssignment;
