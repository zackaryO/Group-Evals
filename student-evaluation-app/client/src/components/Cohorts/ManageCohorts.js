// student-evaluation-app/client/src/components/Cohorts/ManageCohorts.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const ManageCohorts = () => {
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

  const handleDeactivate = async (cohortId) => {
    try {
      await axios.put(`${URL}/api/cohorts/${cohortId}/deactivate`);
      setCohorts((prev) =>
        prev.map((cohort) =>
          cohort._id === cohortId ? { ...cohort, isActive: false } : cohort
        )
      );
      setMessage('Cohort deactivated successfully.');
    } catch (error) {
      setMessage('Error deactivating cohort: ' + error.message);
    }
  };

  return (
    <div className="manage-cohorts-container">
      <h2>Manage Cohorts</h2>
      {message && <p>{message}</p>}
      {cohorts.length > 0 ? (
        <ul>
          {cohorts.map((cohort) => (
            <li key={cohort._id}>
              <p>Name: {cohort.name}</p>
              <p>Start Date: {new Date(cohort.startDate).toLocaleDateString()}</p>
              <p>Status: {cohort.isActive ? 'Active' : 'Inactive'}</p>
              {cohort.isActive && (
                <button onClick={() => handleDeactivate(cohort._id)}>
                  Deactivate
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No cohorts available.</p>
      )}
    </div>
  );
};

export default ManageCohorts;
