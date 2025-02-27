/**
 * ToolsPage.js
 * For CRUD on Tools (name, description, quantityOnHand, location, etc.)
 * Endpoint: /api/tools
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import URL from '../../backEndURL';

const ToolsPage = () => {
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
    imageThumb: {
      width: '80px',
      margin: '0.5rem 0',
      borderRadius: '4px',
      objectFit: 'cover',
      border: '1px solid #ddd',
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

  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantityOnHand, setQuantityOnHand] = useState(0);
  const [room, setRoom] = useState('');
  const [shelf, setShelf] = useState('');
  const [repairStatus, setRepairStatus] = useState('Good');
  const [purchasePriority, setPurchasePriority] = useState('None');
  const [image, setImage] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${URL}/api/tools`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = Array.isArray(res.data) ? res.data : [];
        setTools(data);
      } catch (error) {
        console.error('Error fetching tools:', error);
        if (error.response && error.response.status === 401) {
          navigate('/login');
        }
      }
    };
    fetchTools();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('quantityOnHand', quantityOnHand);
      formData.append('room', room);
      formData.append('shelf', shelf);
      formData.append('repairStatus', repairStatus);
      formData.append('purchasePriority', purchasePriority);
      if (image) {
        formData.append('image', image);
      }

      if (selectedTool) {
        await axios.put(`${URL}/api/tools/${selectedTool._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${URL}/api/tools`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      resetForm();
      const refreshed = await axios.get(`${URL}/api/tools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTools(Array.isArray(refreshed.data) ? refreshed.data : []);
    } catch (error) {
      console.error('Error saving tool:', error);
    }
  };

  const handleEdit = (tool) => {
    setSelectedTool(tool);
    setName(tool.name);
    setDescription(tool.description || '');
    setQuantityOnHand(tool.quantityOnHand || 0);
    setRoom(tool.location?.room || '');
    setShelf(tool.location?.shelf || '');
    setRepairStatus(tool.repairStatus || 'Good');
    setPurchasePriority(tool.purchasePriority || 'None');
    setImage(null);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/tools/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTools((prev) => prev.filter((t) => t._id !== id));
    } catch (error) {
      console.error('Error deleting tool:', error);
    }
  };

  const resetForm = () => {
    setSelectedTool(null);
    setName('');
    setDescription('');
    setQuantityOnHand(0);
    setRoom('');
    setShelf('');
    setRepairStatus('Good');
    setPurchasePriority('None');
    setImage(null);
  };

  return (
    <div style={styles.pageContainer}>
      <h2 style={styles.heading}>Tools Inventory</h2>
      <div style={styles.contentWrapper}>
        {/* LIST OF TOOLS */}
        <div style={styles.listContainer}>
          <h3>Existing Tools</h3>
          {tools.map((tool) => (
            <div key={tool._id} style={styles.itemCard}>
              <p style={styles.itemTitle}>{tool.name}</p>
              <p><strong>Quantity:</strong> {tool.quantityOnHand}</p>
              <p><strong>Repair Status:</strong> {tool.repairStatus}</p>
              <p><strong>Priority:</strong> {tool.purchasePriority}</p>
              {tool.imageUrl && (
                <img
                  src={tool.imageUrl}
                  alt={tool.name}
                  style={styles.imageThumb}
                />
              )}
              <div style={styles.buttonRow}>
                <button style={styles.button} onClick={() => handleEdit(tool)}>Edit</button>
                <button
                  style={styles.buttonSecondary}
                  onClick={() => handleDelete(tool._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* TOOL FORM */}
        <div style={styles.formContainer}>
          <h3>{selectedTool ? 'Edit Tool' : 'Add New Tool'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div style={styles.formGroup}>
              <label style={styles.label}>Name:</label>
              <input
                style={styles.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description:</label>
              <textarea
                style={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quantity On Hand:</label>
              <input
                style={styles.input}
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Room:</label>
              <input
                style={styles.input}
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Shelf:</label>
              <input
                style={styles.input}
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Repair Status:</label>
              <select
                style={styles.select}
                value={repairStatus}
                onChange={(e) => setRepairStatus(e.target.value)}
              >
                <option value="Good">Good</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Under Repair">Under Repair</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Purchase Priority:</label>
              <select
                style={styles.select}
                value={purchasePriority}
                onChange={(e) => setPurchasePriority(e.target.value)}
              >
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Image:</label>
              <input
                style={styles.input}
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
              />
            </div>
            <div style={styles.buttonRowForm}>
              <button style={styles.button} type="submit">
                {selectedTool ? 'Update' : 'Create'}
              </button>
              {selectedTool && (
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

export default ToolsPage;
