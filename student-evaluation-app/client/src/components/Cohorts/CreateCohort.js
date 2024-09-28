// student-evaluation-app/client/src/components/Cohorts/CreateCohort.js
import React, { useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const CreateCohort = ({ user }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [message, setMessage] = useState('');

  const handleCreateCohort = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${URL}/api/cohorts`, {
        name,
        startDate,
      });
      setMessage(`Cohort "${response.data.name}" created successfully!`);
      setName('');
      setStartDate('');
    } catch (error) {
      setMessage('Error creating cohort: ' + error.message);
    }
  };

  return (
    <div className="create-cohort-container">
      <h2>Create New Cohort</h2>
      {message && <p>{message}</p>}
      <form onSubmit={handleCreateCohort}>
        <label>
          Cohort Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Start Date:
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>
        <button type="submit">Create Cohort</button>
      </form>
    </div>
  );
};

export default CreateCohort;
