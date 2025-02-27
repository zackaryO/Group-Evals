/**
 * TrainingVehiclesPage.js
 * Provides CRUD interface for TrainingVehicle records.
 * Endpoint: /api/training-vehicles
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const TrainingVehiclesPage = () => {
  const styles = {
    pageContainer: {
      maxWidth: '1200px',
      margin: '2rem auto',
      background: '#fafafa',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    },
    heading: {
      textAlign: 'center',
      marginBottom: '1.5rem',
      color: '#333',
    },
    contentWrapper: {
      display: 'flex',
      gap: '2rem',
    },
    listContainer: {
      flex: 1,
    },
    itemCard: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '1rem',
      marginBottom: '1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    itemTitle: {
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      color: '#555',
    },
    buttonRow: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1rem',
    },
    button: {
      background: '#007bff',
      color: '#fff',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    buttonSecondary: {
      background: '#6c757d',
      color: '#fff',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    formContainer: {
      flex: 1,
      background: '#fff',
      padding: '1rem',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    formGroup: {
      marginBottom: '1rem',
    },
    label: {
      display: 'block',
      marginBottom: '0.4rem',
      fontWeight: '500',
      color: '#333',
    },
    input: {
      width: '100%',
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #ccc',
    },
    textarea: {
      width: '100%',
      minHeight: '60px',
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #ccc',
    },
    select: {
      width: '100%',
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #ccc',
    },
    buttonRowForm: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1rem',
    },
  };

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Form fields
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [vin, setVin] = useState('');
  const [roNumber, setRoNumber] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [transmissionCode, setTransmissionCode] = useState('');
  const [mileage, setMileage] = useState('');
  const [baumuster, setBaumuster] = useState('');
  const [repairsNeeded, setRepairsNeeded] = useState('');
  const [partsNeeded, setPartsNeeded] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${URL}/api/training-vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = {
        year,
        make,
        model,
        vin,
        roNumber,
        engineCode,
        transmissionCode,
        mileage,
        baumuster,
        repairsNeeded,
        partsNeeded,
      };

      if (selectedVehicle) {
        await axios.put(`${URL}/api/training-vehicles/${selectedVehicle._id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${URL}/api/training-vehicles`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
    }
  };

  const handleEdit = (v) => {
    setSelectedVehicle(v);
    setYear(v.year || '');
    setMake(v.make || '');
    setModel(v.model || '');
    setVin(v.vin || '');
    setRoNumber(v.roNumber || '');
    setEngineCode(v.engineCode || '');
    setTransmissionCode(v.transmissionCode || '');
    setMileage(v.mileage || '');
    setBaumuster(v.baumuster || '');
    setRepairsNeeded(v.repairsNeeded || '');
    setPartsNeeded(v.partsNeeded || '');
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/training-vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles((prev) => prev.filter((v) => v._id !== id));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const resetForm = () => {
    setSelectedVehicle(null);
    setYear('');
    setMake('');
    setModel('');
    setVin('');
    setRoNumber('');
    setEngineCode('');
    setTransmissionCode('');
    setMileage('');
    setBaumuster('');
    setRepairsNeeded('');
    setPartsNeeded('');
  };

  return (
    <div style={styles.pageContainer}>
      <h2 style={styles.heading}>Training Vehicles</h2>
      <div style={styles.contentWrapper}>
        {/* LIST */}
        <div style={styles.listContainer}>
          <h3>Existing Vehicles</h3>
          {vehicles.map((veh) => (
            <div key={veh._id} style={styles.itemCard}>
              <p style={styles.itemTitle}>
                {veh.year} {veh.make} {veh.model}
              </p>
              <p>VIN: {veh.vin}</p>
              <p>RO#: {veh.roNumber}</p>
              <p>Engine: {veh.engineCode} | Trans: {veh.transmissionCode}</p>
              <p>Mileage: {veh.mileage}</p>
              <p>Baumuster: {veh.baumuster}</p>
              <p>Repairs Needed: {veh.repairsNeeded}</p>
              <p>Parts Needed: {veh.partsNeeded}</p>
              <div style={styles.buttonRow}>
                <button style={styles.button} onClick={() => handleEdit(veh)}>Edit</button>
                <button
                  style={styles.buttonSecondary}
                  onClick={() => handleDelete(veh._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div style={styles.formContainer}>
          <h3>{selectedVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Year:</label>
              <input
                style={styles.input}
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Make:</label>
              <input
                style={styles.input}
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Model:</label>
              <input
                style={styles.input}
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>VIN:</label>
              <input
                style={styles.input}
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>RO Number:</label>
              <input
                style={styles.input}
                type="text"
                value={roNumber}
                onChange={(e) => setRoNumber(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Engine Code:</label>
              <input
                style={styles.input}
                type="text"
                value={engineCode}
                onChange={(e) => setEngineCode(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Transmission Code:</label>
              <input
                style={styles.input}
                type="text"
                value={transmissionCode}
                onChange={(e) => setTransmissionCode(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mileage:</label>
              <input
                style={styles.input}
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Baumuster:</label>
              <input
                style={styles.input}
                type="text"
                value={baumuster}
                onChange={(e) => setBaumuster(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Repairs Needed:</label>
              <textarea
                style={styles.textarea}
                value={repairsNeeded}
                onChange={(e) => setRepairsNeeded(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Parts Needed:</label>
              <textarea
                style={styles.textarea}
                value={partsNeeded}
                onChange={(e) => setPartsNeeded(e.target.value)}
              />
            </div>
            <div style={styles.buttonRowForm}>
              <button style={styles.button} type="submit">
                {selectedVehicle ? 'Update' : 'Create'}
              </button>
              {selectedVehicle && (
                <button
                  style={styles.buttonSecondary}
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TrainingVehiclesPage;
