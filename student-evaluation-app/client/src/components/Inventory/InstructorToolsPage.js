/**
 * InstructorToolsPage.js
 *
 * Provides CRUD interface for InstructorTool records.
 * Fields: instructor (ObjectId), toolName, imageUrl, description.
 *
 * Endpoint: /api/instructor-tools
 * Typically, you'd default "instructor" to the current user (if you want).
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const InstructorToolsPage = () => {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);

  // Form fields
  const [toolName, setToolName] = useState('');
  const [description, setDescription] = useState('');
  const [instructorId, setInstructorId] = useState(''); // or auto-fill from user context
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
   * Handle form submit
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
   * Populate form for editing
   */
  const handleEdit = (tool) => {
    setSelectedTool(tool);
    setToolName(tool.toolName);
    setDescription(tool.description || '');
    setInstructorId(tool.instructor?._id || ''); // might be
    setImage(null);
  };

  /**
   * Delete tool
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/instructor-tools/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTools(tools.filter((t) => t._id !== id));
    } catch (error) {
      console.error('Error deleting instructor tool:', error);
    }
  };

  /**
   * Reset form
   */
  const resetForm = () => {
    setSelectedTool(null);
    setToolName('');
    setDescription('');
    setInstructorId('');
    setImage(null);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Instructor Tools</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* List existing tools */}
        <div style={{ flex: 1 }}>
          <h3>Your Tools</h3>
          {tools.map((tool) => (
            <div
              key={tool._id}
              style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}
            >
              <p><strong>Tool Name:</strong> {tool.toolName}</p>
              <p><strong>Description:</strong> {tool.description}</p>
              <p>
                <strong>Instructor:</strong>{' '}
                {tool.instructor?.firstName || ''} {tool.instructor?.lastName || ''}
              </p>
              {tool.imageUrl && (
                <div>
                  <img src={tool.imageUrl} alt={tool.toolName} style={{ width: '100px' }} />
                </div>
              )}
              <button onClick={() => handleEdit(tool)}>Edit</button>
              <button onClick={() => handleDelete(tool._id)}>Delete</button>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          <h3>{selectedTool ? 'Edit Tool' : 'Add New Tool'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div>
              <label>Tool Name:</label>
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label>Instructor ID (optional):</label>
              <input
                type="text"
                value={instructorId}
                onChange={(e) => setInstructorId(e.target.value)}
              />
              {/* 
                If you want to always set it to the current user, 
                you can skip this input and store user._id in state 
              */}
            </div>
            <div>
              <label>Image:</label>
              <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
              />
            </div>
            <button type="submit">{selectedTool ? 'Update' : 'Create'}</button>
            {selectedTool && <button onClick={resetForm}>Cancel</button>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default InstructorToolsPage;
