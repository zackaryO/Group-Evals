import React, { useEffect, useState } from 'react';
import axios from 'axios';

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
    overflowY: 'auto',
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
  imageThumb: {
    width: '80px',
    margin: '0.5rem 0',
    borderRadius: '4px',
    objectFit: 'cover',
    border: '1px solid #ddd',
  },
};

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
              <p>
                <strong>Status:</strong> {need.status}
              </p>
              <p>
                <strong>Priority:</strong> {need.priority}
              </p>
              {need.images &&
                need.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Need"
                    style={styles.imageThumb}
                  />
                ))}
              <div style={styles.buttonRow}>
                <button style={styles.button} onClick={() => handleEdit(need)}>
                  Edit
                </button>
                <button
                  style={styles.buttonSecondary}
                  onClick={() => handleDelete(need._id)}
                >
                  Delete
                </button>
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

export default FacilityNeedsPage;
