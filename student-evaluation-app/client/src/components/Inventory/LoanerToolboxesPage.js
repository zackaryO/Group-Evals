/**
 * @file LoanerToolboxesPage.jsx
 * @description React component for managing loaner toolboxes (CRUD),
 *              including multiple drawer images and a phone-friendly layout.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './LoanerToolboxesPage.css'; // Phone-friendly CSS

const LoanerToolboxesPage = () => {
  const [toolboxes, setToolboxes] = useState([]);
  const [selectedToolbox, setSelectedToolbox] = useState(null);

  // Basic form fields
  const [toolboxName, setToolboxName] = useState('');
  const [drawerImages, setDrawerImages] = useState(null); // multiple
  // Tools field (array of objects) inside the toolbox
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

  /**
   * Fetch existing loaner toolboxes
   */
  const fetchLoanerToolboxes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${URL}/api/loaner-toolboxes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setToolboxes(data);
    } catch (error) {
      console.error('Error fetching loaner toolboxes:', error);
    }
  };

  /**
   * Handle create/update submit
   */
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
        // Update
        await axios.put(`${URL}/api/loaner-toolboxes/${selectedToolbox._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
        await axios.post(`${URL}/api/loaner-toolboxes`, formData, {
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
    setDrawerImages(null);
    if (Array.isArray(box.tools)) {
      setTools(box.tools);
    } else {
      setTools([]);
    }
  };

  /**
   * Delete a toolbox
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/loaner-toolboxes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setToolboxes((prev) => prev.filter((tb) => tb._id !== id));
    } catch (error) {
      console.error('Error deleting loaner toolbox:', error);
    }
  };

  /**
   * Reset the form
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
   * Update fields in the tools array
   */
  const handleToolChange = (index, field, value) => {
    const updatedTools = [...tools];
    updatedTools[index][field] = value;
    setTools(updatedTools);
  };

  /**
   * Add a new tool entry
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
   * Remove a specific tool entry
   */
  const removeTool = (index) => {
    const updatedTools = [...tools];
    updatedTools.splice(index, 1);
    setTools(updatedTools);
  };

  return (
    <div className="loaner-page-container">
      <h2 className="loaner-heading">Loaner Toolboxes</h2>
      <div className="loaner-content-wrapper">
        {/* LIST OF TOOLBOXES */}
        <div className="loaner-list-container">
          <h3>Existing Loaner Toolboxes</h3>
          {toolboxes.map((box) => (
            <div key={box._id} className="loaner-item-card">
              <p className="loaner-item-title">{box.toolboxName}</p>
              {Array.isArray(box.drawerImages) && box.drawerImages.length > 0 && (
                <div>
                  <p><strong>Drawer Images:</strong></p>
                  {box.drawerImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Drawer"
                      className="loaner-image-thumb"
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
              <div className="loaner-button-row">
                <button className="loaner-button-primary" onClick={() => handleEdit(box)}>
                  Edit
                </button>
                <button className="loaner-button-secondary" onClick={() => handleDelete(box._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div className="loaner-form-container">
          <h3>{selectedToolbox ? 'Edit Toolbox' : 'Add New Toolbox'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data" className="loaner-form">
            <div className="loaner-form-group">
              <label>Toolbox Name:</label>
              <input
                type="text"
                value={toolboxName}
                onChange={(e) => setToolboxName(e.target.value)}
                required
              />
            </div>
            <div className="loaner-form-group">
              <label>Drawer Images (multiple):</label>
              <input
                type="file"
                multiple
                onChange={(e) => setDrawerImages(e.target.files)}
              />
            </div>
            <h4>Tools inside the toolbox:</h4>
            {tools.map((tool, index) => (
              <div key={index} className="loaner-tool-item">
                <div className="loaner-form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={tool.name}
                    onChange={(e) => handleToolChange(index, 'name', e.target.value)}
                    required
                  />
                </div>
                <div className="loaner-form-group">
                  <label>Description:</label>
                  <input
                    type="text"
                    value={tool.description}
                    onChange={(e) => handleToolChange(index, 'description', e.target.value)}
                  />
                </div>
                <div className="loaner-form-group">
                  <label>Quantity:</label>
                  <input
                    type="number"
                    value={tool.quantity}
                    onChange={(e) => handleToolChange(index, 'quantity', e.target.value)}
                  />
                </div>
                <div className="loaner-form-group">
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
                <div className="loaner-form-group">
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
                <div className="loaner-button-row">
                  <button
                    type="button"
                    className="loaner-button-secondary"
                    onClick={() => removeTool(index)}
                  >
                    Remove Tool
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="loaner-button-primary" onClick={addTool}>
              + Add Another Tool
            </button>
            <div className="loaner-button-row-form">
              <button className="loaner-button-primary" type="submit">
                {selectedToolbox ? 'Update' : 'Create'}
              </button>
              {selectedToolbox && (
                <button
                  className="loaner-button-secondary"
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
