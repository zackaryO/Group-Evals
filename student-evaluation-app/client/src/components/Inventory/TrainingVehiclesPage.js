/**
 * @file TrainingVehiclesPage.jsx
 * @description React component for managing TrainingVehicle records (CRUD),
 *              using a phone-friendly layout with separate CSS.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './TrainingVehiclesPage.css';

const TrainingVehiclesPage = () => {
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

  /**
   * Fetch existing training vehicles
   */
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

  /**
   * Create or update a vehicle
   */
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
        // Update
        await axios.put(`${URL}/api/training-vehicles/${selectedVehicle._id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
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

  /**
   * Populate form to edit
   */
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

  /**
   * Delete vehicle
   */
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

  /**
   * Reset the form
   */
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
    <div className="tv-page-container">
      <h2 className="tv-heading">Training Vehicles</h2>
      <div className="tv-content-wrapper">
        {/* LIST */}
        <div className="tv-list-container">
          <h3>Existing Vehicles</h3>
          {vehicles.map((veh) => (
            <div key={veh._id} className="tv-item-card">
              <p className="tv-item-title">
                {veh.year} {veh.make} {veh.model}
              </p>
              <p>VIN: {veh.vin}</p>
              <p>RO#: {veh.roNumber}</p>
              <p>Engine: {veh.engineCode} | Trans: {veh.transmissionCode}</p>
              <p>Mileage: {veh.mileage}</p>
              <p>Baumuster: {veh.baumuster}</p>
              <p>Repairs Needed: {veh.repairsNeeded}</p>
              <p>Parts Needed: {veh.partsNeeded}</p>
              <div className="tv-button-row">
                <button className="tv-button-primary" onClick={() => handleEdit(veh)}>
                  Edit
                </button>
                <button
                  className="tv-button-secondary"
                  onClick={() => handleDelete(veh._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div className="tv-form-container">
          <h3>{selectedVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
          <form onSubmit={handleSubmit} className="tv-form">
            <div className="tv-form-group">
              <label>Year:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>Make:</label>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>Model:</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>VIN:</label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>RO Number:</label>
              <input
                type="text"
                value={roNumber}
                onChange={(e) => setRoNumber(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>Engine Code:</label>
              <input
                type="text"
                value={engineCode}
                onChange={(e) => setEngineCode(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>Transmission Code:</label>
              <input
                type="text"
                value={transmissionCode}
                onChange={(e) => setTransmissionCode(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>Mileage:</label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>Baumuster:</label>
              <input
                type="text"
                value={baumuster}
                onChange={(e) => setBaumuster(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>Repairs Needed:</label>
              <textarea
                value={repairsNeeded}
                onChange={(e) => setRepairsNeeded(e.target.value)}
              />
            </div>
            <div className="tv-form-group">
              <label>Parts Needed:</label>
              <textarea
                value={partsNeeded}
                onChange={(e) => setPartsNeeded(e.target.value)}
              />
            </div>
            <div className="tv-button-row-form">
              <button className="tv-button-primary" type="submit">
                {selectedVehicle ? 'Update' : 'Create'}
              </button>
              {selectedVehicle && (
                <button
                  className="tv-button-secondary"
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
