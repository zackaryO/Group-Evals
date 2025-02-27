import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Inventory.css';

const FacilityNeedsPage = () => {
 

  const [needs, setNeeds] = useState([]);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');
  const [priority, setPriority] = useState('Low');
  const [assignedTo, setAssignedTo] = useState('');
  const [images, setImages] = useState(null);

  useEffect(() => {
    fetchFacilityNeeds();
  }, []);

  const fetchFacilityNeeds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/facility-needs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setNeeds(data);
    } catch (error) {
      console.error('Error fetching facility needs:', error);
    }
  };

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
        await axios.put(`/api/facility-needs/${selectedNeed._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
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
      await axios.delete(`/api/facility-needs/${id}`, {
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
    <div style={styles.pageContainer}>
      <h2 style={styles.heading}>Facility Needs / Repairs</h2>
      <div style={styles.contentWrapper}>
        <div style={styles.listContainer}>
          <h3>Existing Facility Needs</h3>
          {needs.map((need) => (
            <div key={need._id} style={styles.itemCard}>
              <p style={styles.itemTitle}>{need.description}</p>
              <p><strong>Status:</strong> {need.status}</p>
              <p><strong>Priority:</strong> {need.priority}</p>
              {need.images && need.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="Need"
                  style={styles.imageThumb}
                />
              ))}
              <div style={styles.buttonRow}>
                <button style={styles.button} onClick={() => handleEdit(need)}>Edit</button>
                <button style={styles.buttonSecondary} onClick={() => handleDelete(need._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.formContainer}>
          <h3>{selectedNeed ? 'Edit Need' : 'Add New Need'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div style={styles.formGroup}>
              <label style={styles.label}>Description:</label>
              <textarea
                style={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status:</label>
              <select
                style={styles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Priority:</label>
              <select
                style={styles.select}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Assigned To (UserID):</label>
              <input
                style={styles.input}
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Images (multiple):</label>
              <input
                style={styles.input}
                type="file"
                multiple
                onChange={(e) => setImages(e.target.files)}
              />
            </div>
            <div style={styles.buttonRow}>
              <button style={styles.button} type="submit">
                {selectedNeed ? 'Update' : 'Create'}
              </button>
              {selectedNeed && (
                <button style={styles.buttonSecondary} type="button" onClick={resetForm}>
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
