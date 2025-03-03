/**
 * @file FacilityNeedsPage.jsx
 * @description React component for managing FacilityNeeds (CRUD), multiple images allowed.
 *              Uses phone-friendly styling akin to ToolsPage.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './FacilityNeedsPage.css';

const FacilityNeedsPage = () => {
  const [needs, setNeeds] = useState([]);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');
  const [priority, setPriority] = useState('Low');
  const [assignedTo, setAssignedTo] = useState('');
  const [images, setImages] = useState(null);

  /**
   * Fetch facility needs on mount
   */
  useEffect(() => {
    fetchFacilityNeeds();
  }, []);

  const fetchFacilityNeeds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${URL}/api/facility-needs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setNeeds(data);
    } catch (error) {
      console.error('Error fetching facility needs:', error);
    }
  };

  /**
   * Handle form (create/update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('description', description);
      formData.append('status', status);
      formData.append('priority', priority);
      if (assignedTo) {
        formData.append('assignedTo', assignedTo);
      }
      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append('images', images[i]);
        }
      }

      if (selectedNeed) {
        // Update
        await axios.put(`${URL}/api/facility-needs/${selectedNeed._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
        await axios.post(`${URL}/api/facility-needs`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      fetchFacilityNeeds();
    } catch (error) {
      console.error('Error saving facility need:', error);
    }
  };

  const handleEdit = (need) => {
    setSelectedNeed(need);
    setDescription(need.description);
    setStatus(need.status);
    setPriority(need.priority);
    setAssignedTo(need.assignedTo || '');
    setImages(null);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/facility-needs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNeeds((prev) => prev.filter((n) => n._id !== id));
    } catch (error) {
      console.error('Error deleting facility need:', error);
    }
  };

  const resetForm = () => {
    setSelectedNeed(null);
    setDescription('');
    setStatus('Pending');
    setPriority('Low');
    setAssignedTo('');
    setImages(null);
  };

  return (
    <div className="fn-page-container">
      <h2 className="fn-heading">Facility Needs / Repairs</h2>
      <div className="fn-content-wrapper">
        {/* LIST */}
        <div className="fn-list-container">
          <h3>Existing Facility Needs</h3>
          {needs.map((need) => (
            <div key={need._id} className="fn-item-card">
              <p className="fn-item-title">{need.description}</p>
              <p><strong>Status:</strong> {need.status}</p>
              <p><strong>Priority:</strong> {need.priority}</p>
              {need.images && need.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="Need"
                  className="fn-image-thumb"
                />
              ))}
              <div className="fn-button-row">
                <button
                  className="fn-button-primary"
                  onClick={() => handleEdit(need)}
                >
                  Edit
                </button>
                <button
                  className="fn-button-secondary"
                  onClick={() => handleDelete(need._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div className="fn-form-container">
          <h3>{selectedNeed ? 'Edit Need' : 'Add New Need'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data" className="fn-form">
            <div className="fn-form-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="fn-form-group">
              <label>Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="fn-form-group">
              <label>Priority:</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="fn-form-group">
              <label>Assigned To (UserID):</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            </div>
            <div className="fn-form-group">
              <label>Images (multiple):</label>
              <input
                type="file"
                multiple
                onChange={(e) => setImages(e.target.files)}
              />
            </div>
            <div className="fn-button-row-form">
              <button className="fn-button-primary" type="submit">
                {selectedNeed ? 'Update' : 'Create'}
              </button>
              {selectedNeed && (
                <button
                  className="fn-button-secondary"
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

export default FacilityNeedsPage;
