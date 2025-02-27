/**
 * LoanerToolboxesPage.js
 *
 * Provides CRUD interface for LoanerToolbox records.
 * Fields: toolboxName, drawerImages[], tools[] (array of { name, description, quantity, repairStatus, purchasePriority }).
 *
 * Endpoint: /api/loaner-toolboxes
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const LoanerToolboxesPage = () => {
  // Inline style objects
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
      margin: '0.5rem',
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
    toolItem: {
      border: '1px solid #999',
      borderRadius: '4px',
      padding: '0.5rem',
      marginBottom: '1rem',
      background: '#fafafa',
    },
    buttonRowForm: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1rem',
    },
  };

  const [toolboxes, setToolboxes] = useState([]);
  const [selectedToolbox, setSelectedToolbox] = useState(null);

  // Basic form fields
  const [toolboxName, setToolboxName] = useState('');
  const [drawerImages, setDrawerImages] = useState(null); // multiple
  // Tools field (array of objects)
  const [tools, setTools] = useState([
    {
      name: '',
      description: '',
      quantity: 1,
      repairStatus: 'Good',
      purchasePriority: 'None',
    },
  ]);

  useEffect(() => {
    fetchLoanerToolboxes();
  }, []);

  const fetchLoanerToolboxes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/loaner-toolboxes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setToolboxes(data);
    } catch (error) {
      console.error('Error fetching loaner toolboxes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('toolboxName', toolboxName);
      formData.append('tools', JSON.stringify(tools));

      if (drawerImages) {
        for (let i = 0; i < drawerImages.length; i++) {
          formData.append('images', drawerImages[i]);
        }
      }

      if (selectedToolbox) {
        // Update existing
        await axios.put(`/api/loaner-toolboxes/${selectedToolbox._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new
        await axios.post('/api/loaner-toolboxes', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      resetForm();
      fetchLoanerToolboxes();
    } catch (error) {
      console.error('Error saving loaner toolbox:', error);
    }
  };

  const handleEdit = (box) => {
    setSelectedToolbox(box);
    setToolboxName(box.toolboxName);
    setDrawerImages(null);

    if (Array.isArray(box.tools)) {
      setTools(box.tools);
    } else {
      setTools([]);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/loaner-toolboxes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToolboxes((prev) => prev.filter((tb) => tb._id !== id));
    } catch (error) {
      console.error('Error deleting loaner toolbox:', error);
    }
  };

  const resetForm = () => {
    setSelectedToolbox(null);
    setToolboxName('');
    setDrawerImages(null);
    setTools([
      {
        name: '',
        description: '',
        quantity: 1,
        repairStatus: 'Good',
        purchasePriority: 'None',
      },
    ]);
  };

  const handleToolChange = (index, field, value) => {
    const updatedTools = [...tools];
    updatedTools[index][field] = value;
    setTools(updatedTools);
  };

  const addTool = () => {
    setTools([
      ...tools,
      {
        name: '',
        description: '',
        quantity: 1,
        repairStatus: 'Good',
        purchasePriority: 'None',
      },
    ]);
  };

  const removeTool = (index) => {
    const updatedTools = [...tools];
    updatedTools.splice(index, 1);
    setTools(updatedTools);
  };

  return (
    <div style={styles.pageContainer}>
      <h2 style={styles.heading}>Loaner Toolboxes</h2>
      <div style={styles.contentWrapper}>
        {/* LIST OF TOOLBOXES */}
        <div style={styles.listContainer}>
          <h3>Existing Loaner Toolboxes</h3>
          {toolboxes.map((box) => (
            <div key={box._id} style={styles.itemCard}>
              <p style={styles.itemTitle}>{box.toolboxName}</p>
              {Array.isArray(box.drawerImages) && box.drawerImages.length > 0 && (
                <div>
                  <p><strong>Drawer Images:</strong></p>
                  {box.drawerImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Drawer"
                      style={styles.imageThumb}
                    />
                  ))}
                </div>
              )}
              {Array.isArray(box.tools) && box.tools.length > 0 && (
                <div>
                  <p><strong>Tools in this toolbox:</strong></p>
                  {box.tools.map((t, tIndex) => (
                    <div key={tIndex} style={{ marginBottom: '0.5rem' }}>
                      • {t.name} (Qty: {t.quantity})
                      [Status: {t.repairStatus}, Priority: {t.purchasePriority}]
                    </div>
                  ))}
                </div>
              )}
              <div style={styles.buttonRow}>
                <button style={styles.button} onClick={() => handleEdit(box)}>Edit</button>
                <button style={styles.buttonSecondary} onClick={() => handleDelete(box._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div style={styles.formContainer}>
          <h3>{selectedToolbox ? 'Edit Toolbox' : 'Add New Toolbox'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div style={styles.formGroup}>
              <label style={styles.label}>Toolbox Name:</label>
              <input
                style={styles.input}
                type="text"
                value={toolboxName}
                onChange={(e) => setToolboxName(e.target.value)}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Drawer Images (multiple):</label>
              <input
                style={styles.input}
                type="file"
                multiple
                onChange={(e) => setDrawerImages(e.target.files)}
              />
            </div>
            <h4>Tools inside the toolbox:</h4>
            {tools.map((tool, index) => (
              <div key={index} style={styles.toolItem}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name:</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={tool.name}
                    onChange={(e) => handleToolChange(index, 'name', e.target.value)}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Description:</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={tool.description}
                    onChange={(e) => handleToolChange(index, 'description', e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Quantity:</label>
                  <input
                    style={styles.input}
                    type="number"
                    value={tool.quantity}
                    onChange={(e) => handleToolChange(index, 'quantity', e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Repair Status:</label>
                  <select
                    style={styles.select}
                    value={tool.repairStatus}
                    onChange={(e) => handleToolChange(index, 'repairStatus', e.target.value)}
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
                    value={tool.purchasePriority}
                    onChange={(e) => handleToolChange(index, 'purchasePriority', e.target.value)}
                  >
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div style={styles.buttonRow}>
                  <button
                    type="button"
                    style={styles.buttonSecondary}
                    onClick={() => removeTool(index)}
                  >
                    Remove Tool
                  </button>
                </div>
              </div>
            ))}
            <button type="button" style={styles.button} onClick={addTool}>
              + Add Another Tool
            </button>
            <div style={styles.buttonRowForm}>
              <button style={styles.button} type="submit">
                {selectedToolbox ? 'Update' : 'Create'}
              </button>
              {selectedToolbox && (
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

export default LoanerToolboxesPage;
