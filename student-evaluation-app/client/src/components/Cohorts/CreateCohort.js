// student-evaluation-app/client/src/components/Cohorts/CreateCohort.js
import React, { useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const CreateCohort = ({ user }) => {
  const [name, setName] = useState('');
  const [gradDate, setGradDate] = useState('');
  const [message, setMessage] = useState('');

  const handleCreateCohort = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${URL}/api/cohorts`, {
        name,
        gradDate,
      });
      setMessage(`Cohort "${response.data.name}" created successfully!`);
      setName('');
      setGradDate('');
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
          Grad Date:
          <input
            type="date"
            value={gradDate}
            onChange={(e) => setGradDate(e.target.value)}
            required
          />
        </label>
        <button type="submit">Create Cohort</button>
      </form>
    </div>
  );
};

export default CreateCohort;
