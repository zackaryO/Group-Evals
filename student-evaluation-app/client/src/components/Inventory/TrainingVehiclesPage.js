/**
 * TrainingVehiclesPage.js
 *
 * Provides CRUD interface for TrainingVehicle records.
 * Fields: year, make, model, vin, roNumber, engineCode, transmissionCode,
 *         mileage, baumuster, repairsNeeded, partsNeeded.
 *
 * Endpoint: /api/training-vehicles
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';

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
   * Fetch all training vehicles
   */
  const fetchVehicles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/training-vehicles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(res.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  /**
   * Handle form submit
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
        // update
        await axios.put(`/api/training-vehicles/${selectedVehicle._id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // create
        await axios.post('/api/training-vehicles', data, {
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
   * Edit existing
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
   * Delete
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/training-vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(vehicles.filter((v) => v._id !== id));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  /**
   * Reset form
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
    <div style={{ padding: '1rem' }}>
      <h2>Training Vehicles</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* List */}
        <div style={{ flex: 1 }}>
          <h3>Existing Vehicles</h3>
          {vehicles.map((veh) => (
            <div
              key={veh._id}
              style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}
            >
              <p><strong>{veh.year} {veh.make} {veh.model}</strong></p>
              <p>VIN: {veh.vin}</p>
              <p>RO#: {veh.roNumber}</p>
              <p>Engine: {veh.engineCode} | Trans: {veh.transmissionCode}</p>
              <p>Mileage: {veh.mileage}</p>
              <p>Baumuster: {veh.baumuster}</p>
              <p>Repairs Needed: {veh.repairsNeeded}</p>
              <p>Parts Needed: {veh.partsNeeded}</p>
              <button onClick={() => handleEdit(veh)}>Edit</button>
              <button onClick={() => handleDelete(veh._id)}>Delete</button>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          <h3>{selectedVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
          <form onSubmit={handleSubmit}>
            <div>
              <label>Year:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div>
              <label>Make:</label>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
              />
            </div>
            <div>
              <label>Model:</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div>
              <label>VIN:</label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
              />
            </div>
            <div>
              <label>RO Number:</label>
              <input
                type="text"
                value={roNumber}
                onChange={(e) => setRoNumber(e.target.value)}
              />
            </div>
            <div>
              <label>Engine Code:</label>
              <input
                type="text"
                value={engineCode}
                onChange={(e) => setEngineCode(e.target.value)}
              />
            </div>
            <div>
              <label>Transmission Code:</label>
              <input
                type="text"
                value={transmissionCode}
                onChange={(e) => setTransmissionCode(e.target.value)}
              />
            </div>
            <div>
              <label>Mileage:</label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
              />
            </div>
            <div>
              <label>Baumuster:</label>
              <input
                type="text"
                value={baumuster}
                onChange={(e) => setBaumuster(e.target.value)}
              />
            </div>
            <div>
              <label>Repairs Needed:</label>
              <textarea
                value={repairsNeeded}
                onChange={(e) => setRepairsNeeded(e.target.value)}
              />
            </div>
            <div>
              <label>Parts Needed:</label>
              <textarea
                value={partsNeeded}
                onChange={(e) => setPartsNeeded(e.target.value)}
              />
            </div>
            <button type="submit">{selectedVehicle ? 'Update' : 'Create'}</button>
            {selectedVehicle && <button onClick={resetForm}>Cancel</button>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default TrainingVehiclesPage;
