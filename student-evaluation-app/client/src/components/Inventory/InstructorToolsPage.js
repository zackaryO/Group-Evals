/**
 * @file InstructorToolsPage.jsx
 * @description React component for managing InstructorTool records (CRUD),
 *              using a phone-friendly layout (similar to ToolsPage).
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './InstructorToolsPage.css';

const InstructorToolsPage = () => {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);

  // Form fields
  const [toolName, setToolName] = useState('');
  const [description, setDescription] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [image, setImage] = useState(null);

  useEffect(() => {
    fetchInstructorTools();
  }, []);

  /**
   * Fetch all instructor tools
   */
  const fetchInstructorTools = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${URL}/api/instructor-tools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTools(response.data);
    } catch (error) {
      console.error('Error fetching instructor tools:', error);
    }
  };

  /**
   * Handle form submission (create/update)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('toolName', toolName);
      formData.append('description', description);
      if (instructorId) {
        formData.append('instructor', instructorId);
      }
      if (image) {
        formData.append('image', image);
      }

      if (selectedTool) {
        // Update existing
        await axios.put(`${URL}/api/instructor-tools/${selectedTool._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new
        await axios.post(`${URL}/api/instructor-tools`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      fetchInstructorTools();
    } catch (error) {
      console.error('Error saving instructor tool:', error);
    }
  };

  /**
   * Populate the form for editing a tool
   */
  const handleEdit = (tool) => {
    setSelectedTool(tool);
    setToolName(tool.toolName);
    setDescription(tool.description || '');
    setInstructorId(tool.instructor?._id || '');
    setImage(null);
  };

  /**
   * Delete a tool
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/instructor-tools/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTools((prev) => prev.filter((t) => t._id !== id));
    } catch (error) {
      console.error('Error deleting instructor tool:', error);
    }
  };

  /**
   * Reset the form to blank
   */
  const resetForm = () => {
    setSelectedTool(null);
    setToolName('');
    setDescription('');
    setInstructorId('');
    setImage(null);
  };

  return (
    <div className="inst-page-container">
      <h2 className="inst-heading">Instructor Tools</h2>

      <div className="inst-content-wrapper">
        {/* LIST */}
        <div className="inst-list-container">
          <h3>Your Tools</h3>
          {tools.map((tool) => (
            <div key={tool._id} className="inst-item-card">
              <p className="inst-item-title">{tool.toolName}</p>
              <p><strong>Description:</strong> {tool.description}</p>
              <p>
                <strong>Instructor:</strong>{' '}
                {tool.instructor?.firstName || ''} {tool.instructor?.lastName || ''}
              </p>
              {tool.imageUrl && (
                <img
                  src={tool.imageUrl}
                  alt={tool.toolName}
                  className="inst-image-thumb"
                />
              )}
              <div className="inst-button-row">
                <button
                  className="inst-button-primary"
                  onClick={() => handleEdit(tool)}
                >
                  Edit
                </button>
                <button
                  className="inst-button-secondary"
                  onClick={() => handleDelete(tool._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div className="inst-form-container">
          <h3>{selectedTool ? 'Edit Tool' : 'Add New Tool'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data" className="inst-form">
            <div className="inst-form-group">
              <label>Tool Name:</label>
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                required
              />
            </div>
            <div className="inst-form-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="inst-form-group">
              <label>Instructor ID (optional):</label>
              <input
                type="text"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
              />
            </div>
            <div className="inst-form-group">
              <label>Image (optional):</label>
              <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
              />
            </div>
            <div className="inst-button-row-form">
              <button className="inst-button-primary" type="submit">
                {selectedTool ? 'Update' : 'Create'}
              </button>
              {selectedTool && (
                <button
                  className="inst-button-secondary"
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

export default InstructorToolsPage;
