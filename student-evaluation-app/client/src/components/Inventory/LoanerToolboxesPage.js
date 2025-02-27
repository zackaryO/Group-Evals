/**
 * LoanerToolboxesPage.js
 *
 * Provides CRUD interface for LoanerToolbox records.
 * Fields: toolboxName, drawerImages[], tools[] (array of { name, description, quantity, repairStatus, purchasePriority, imageUrl }).
 *
 * Endpoint: /api/loaner-toolboxes
 * Uses multipart form data to upload multiple images for drawerImages.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const LoanerToolboxesPage = () => {
  const [toolboxes, setToolboxes] = useState([]);
  const [selectedToolbox, setSelectedToolbox] = useState(null);

  // Basic form fields
  const [toolboxName, setToolboxName] = useState('');
  const [drawerImages, setDrawerImages] = useState(null); // multiple
  // Tools field (JSON array)
  const [tools, setTools] = useState([
    {
      name: '',
      description: '',
      quantity: 1,
      repairStatus: 'Good',
      purchasePriority: 'None',
      // imageUrl would be stored after upload, but for simplicity, we can ignore it here
    },
  ]);

  useEffect(() => {
    fetchLoanerToolboxes();
  }, []);

  /**
   * Fetch all loaner toolboxes from server
   */
  const fetchLoanerToolboxes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/loaner-toolboxes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToolboxes(response.data);
    } catch (error) {
      console.error('Error fetching loaner toolboxes:', error);
    }
  };

  /**
   * Handle form submission (create or update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      // We will send a FormData object because we may have multiple images
      const formData = new FormData();
      formData.append('toolboxName', toolboxName);

      // Convert tools array to JSON string for sending
      formData.append('tools', JSON.stringify(tools));

      // If multiple images are selected
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

  /**
   * Populate form for editing
   */
  const handleEdit = (box) => {
    setSelectedToolbox(box);
    setToolboxName(box.toolboxName);
    // We do not have the actual images in box.drawerImages (just URLs), so we won't set drawerImages for editing
    // If you want to allow re-uploading, it will override them.
    setDrawerImages(null);

    // Tools might contain array of objects
    if (box.tools) {
      setTools(box.tools);
    } else {
      setTools([]);
    }
  };

  /**
   * Delete toolbox
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/loaner-toolboxes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToolboxes(toolboxes.filter((tb) => tb._id !== id));
    } catch (error) {
      console.error('Error deleting loaner toolbox:', error);
    }
  };

  /**
   * Reset form
   */
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

  /**
   * Handle dynamic updates to tools array
   */
  const handleToolChange = (index, field, value) => {
    const updatedTools = [...tools];
    updatedTools[index][field] = value;
    setTools(updatedTools);
  };

  /**
   * Add a new tool row
   */
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

  /**
   * Remove a tool row
   */
  const removeTool = (index) => {
    const updatedTools = [...tools];
    updatedTools.splice(index, 1);
    setTools(updatedTools);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Loaner Toolboxes</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* List of toolboxes */}
        <div style={{ flex: 1 }}>
          <h3>Existing Loaner Toolboxes</h3>
          {toolboxes.map((box) => (
            <div
              key={box._id}
              style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}
            >
              <p><strong>Name:</strong> {box.toolboxName}</p>
              {box.drawerImages && box.drawerImages.length > 0 && (
                <div>
                  <p><strong>Drawer Images:</strong></p>
                  {box.drawerImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Drawer"
                      style={{ width: '100px', marginRight: '0.5rem' }}
                    />
                  ))}
                </div>
              )}
              {box.tools && box.tools.length > 0 && (
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
              <button onClick={() => handleEdit(box)}>Edit</button>
              <button onClick={() => handleDelete(box._id)}>Delete</button>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          <h3>{selectedToolbox ? 'Edit Toolbox' : 'Add New Toolbox'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div>
              <label>Toolbox Name:</label>
              <input
                type="text"
                value={toolboxName}
                onChange={(e) => setToolboxName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Drawer Images (multiple):</label>
              <input
                type="file"
                multiple
                onChange={(e) => setDrawerImages(e.target.files)}
              />
            </div>
            <h4>Tools inside the toolbox:</h4>
            {tools.map((tool, index) => (
              <div
                key={index}
                style={{ border: '1px solid #999', padding: '0.5rem', marginBottom: '1rem' }}
              >
                <div>
                  <label>Name:</label>
                  <input
                    type="text"
                    value={tool.name}
                    onChange={(e) => handleToolChange(index, 'name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label>Description:</label>
                  <input
                    type="text"
                    value={tool.description}
                    onChange={(e) => handleToolChange(index, 'description', e.target.value)}
                  />
                </div>
                <div>
                  <label>Quantity:</label>
                  <input
                    type="number"
                    value={tool.quantity}
                    onChange={(e) => handleToolChange(index, 'quantity', e.target.value)}
                  />
                </div>
                <div>
                  <label>Repair Status:</label>
                  <select
                    value={tool.repairStatus}
                    onChange={(e) => handleToolChange(index, 'repairStatus', e.target.value)}
                  >
                    <option value="Good">Good</option>
                    <option value="Needs Repair">Needs Repair</option>
                    <option value="Under Repair">Under Repair</option>
                  </select>
                </div>
                <div>
                  <label>Purchase Priority:</label>
                  <select
                    value={tool.purchasePriority}
                    onChange={(e) => handleToolChange(index, 'purchasePriority', e.target.value)}
                  >
                    <option value="None">None</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <button type="button" onClick={() => removeTool(index)}>
                  Remove Tool
                </button>
              </div>
            ))}
            <button type="button" onClick={addTool}>
              + Add Another Tool
            </button>

            <div style={{ marginTop: '1rem' }}>
              <button type="submit">{selectedToolbox ? 'Update' : 'Create'}</button>
              {selectedToolbox && <button onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoanerToolboxesPage;
