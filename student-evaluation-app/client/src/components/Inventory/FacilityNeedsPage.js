/**
 * FacilityNeedsPage.js
 *
 * Provides CRUD interface for FacilityNeed records.
 * Fields: description, status, priority, assignedTo, images[].
 *
 * Endpoint: /api/facility-needs
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const FacilityNeedsPage = () => {
  const [needs, setNeeds] = useState([]);
  const [selectedNeed, setSelectedNeed] = useState(null);

  // Form fields
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');
  const [priority, setPriority] = useState('Low');
  const [assignedTo, setAssignedTo] = useState('');
  const [images, setImages] = useState(null); // multiple

  useEffect(() => {
    fetchFacilityNeeds();
  }, []);

  /**
   * Fetch all facility needs
   */
  const fetchFacilityNeeds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/facility-needs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNeeds(res.data);
    } catch (error) {
      console.error('Error fetching facility needs:', error);
    }
  };

  /**
   * Handle form submit (create or update)
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

      // multiple images
      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append('images', images[i]);
        }
      }

      if (selectedNeed) {
        // Update
        await axios.put(`/api/facility-needs/${selectedNeed._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
        await axios.post('/api/facility-needs', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      fetchFacilityNeeds();
    } catch (error) {
      console.error('Error saving facility need:', error);
    }
  };

  /**
   * Edit
   */
  const handleEdit = (need) => {
    setSelectedNeed(need);
    setDescription(need.description);
    setStatus(need.status);
    setPriority(need.priority);
    setAssignedTo(need.assignedTo || '');
    setImages(null);
  };

  /**
   * Delete
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/facility-needs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNeeds(needs.filter((n) => n._id !== id));
    } catch (error) {
      console.error('Error deleting facility need:', error);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setSelectedNeed(null);
    setDescription('');
    setStatus('Pending');
    setPriority('Low');
    setAssignedTo('');
    setImages(null);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Facility Needs / Repairs</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* List of needs */}
        <div style={{ flex: 1 }}>
          <h3>Existing Facility Needs</h3>
          {needs.map((need) => (
            <div
              key={need._id}
              style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}
            >
              <p><strong>Description:</strong> {need.description}</p>
              <p><strong>Status:</strong> {need.status}</p>
              <p><strong>Priority:</strong> {need.priority}</p>
              {need.images && need.images.map((img, idx) => (
                <img key={idx} src={img} alt="Need" style={{ width: '100px', marginRight: '0.5rem' }} />
              ))}
              <button onClick={() => handleEdit(need)}>Edit</button>
              <button onClick={() => handleDelete(need._id)}>Delete</button>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          <h3>{selectedNeed ? 'Edit Need' : 'Add New Need'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div>
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Status:</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label>Priority:</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label>Assigned To (UserID):</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            </div>
            <div>
              <label>Images (multiple):</label>
              <input
                type="file"
                multiple
                onChange={(e) => setImages(e.target.files)}
              />
            </div>
            <button type="submit">{selectedNeed ? 'Update' : 'Create'}</button>
            {selectedNeed && <button onClick={resetForm}>Cancel</button>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default FacilityNeedsPage;
