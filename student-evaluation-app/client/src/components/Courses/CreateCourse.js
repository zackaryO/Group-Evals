// student-evaluation-app/client/src/components/Courses/CreateCourse.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const CreateCourse = ({ user }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [cohorts, setCohorts] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCohorts = async () => {
      try {
        const response = await axios.get(`${URL}/api/cohorts`);
        setCohorts(response.data);
      } catch (error) {
        setMessage('Error fetching cohorts: ' + error.message);
      }
    };
    fetchCohorts();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${URL}/api/courses`, {
        title,
        description,
        cohortId,
      });
      setMessage(`Course "${response.data.title}" created successfully!`);
      setTitle('');
      setDescription('');
      setCohortId('');
    } catch (error) {
      setMessage('Error creating course: ' + error.message);
    }
  };

  return (
    <div className="create-course-container">
      <h2>Create New Course</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleCreateCourse}>
        <label>
          Course Title:
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
        <button type="submit">Create Course</button>
      </form>
    </div>
  );
};

export default CreateCourse;
