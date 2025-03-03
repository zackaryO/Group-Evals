/**
 * @file ToolsPage.jsx
 * @description React component for managing Tool records (CRUD) with optional image uploads to S3
 *              (via the backend). Displaying images is limited in max size for better UI.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import URL from '../../backEndURL'; // Adjust to your actual backend URL
import './ToolsPage.css'; // Import the CSS for styling

/**
 * ToolsPage Component
 * - Fetches and displays a list of tools from /api/tools
 * - Provides a form to create or edit a tool, including optional image upload
 */
const ToolsPage = () => {
  // State to hold all tool records
  const [tools, setTools] = useState([]);

  // State for editing a specific tool
  const [selectedTool, setSelectedTool] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [partnum, setPartnum] = useState('')
  const [description, setDescription] = useState('');
  const [quantityOnHand, setQuantityOnHand] = useState(1);
  const [room, setRoom] = useState('');
  const [shelf, setShelf] = useState('');
  const [repairStatus, setRepairStatus] = useState('Good');
  const [purchasePriority, setPurchasePriority] = useState('None');
  const [image, setImage] = useState(null);

  const navigate = useNavigate();

  /**
   * Fetch all tools on component mount.
   * If unauthorized (401), redirect to /login.
   */
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

  /**
   * Handle form submission (create or update a tool).
   * Sends multipart/form-data if an image is present.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // Prepare FormData for file upload (if image is selected)
      const formData = new FormData();
      formData.append('name', name);
      formData.append('partnum', partnum);
      formData.append('description', description);
      formData.append('quantityOnHand', quantityOnHand);
      formData.append('room', room);
      formData.append('shelf', shelf);
      formData.append('repairStatus', repairStatus);
      formData.append('purchasePriority', purchasePriority);
      if (image) {
        formData.append('image', image); // must match "uploadSingle('image')" on the server
      }

      // Determine create vs. update
      if (selectedTool) {
        // Update
        await axios.put(`${URL}/api/tools/${selectedTool._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new
        await axios.post(`${URL}/api/tools`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Refresh the list
      resetForm();
      const refreshed = await axios.get(`${URL}/api/tools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTools(Array.isArray(refreshed.data) ? refreshed.data : []);
    } catch (error) {
      console.error('Error saving tool:', error);
    }
  };

  /**
   * Begin editing a tool (loads the tool data into the form).
   */
  const handleEdit = (tool) => {
    setSelectedTool(tool);
    setName(tool.name);
    setPartnum(tool.partnum);
    setDescription(tool.description || '');
    setQuantityOnHand(tool.quantityOnHand || 1);
    setRoom(tool.location?.room || '');
    setShelf(tool.location?.shelf || '');
    setRepairStatus(tool.repairStatus || 'Good');
    setPurchasePriority(tool.purchasePriority || 'None');
    setImage(null); // clear old file from state
  };

  /**
   * Delete a specific tool by ID.
   */
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

  /**
   * Reset the form to a blank state.
   */
  const resetForm = () => {
    setSelectedTool(null);
    setName('');
    setPartnum('');
    setDescription('');
    setQuantityOnHand(1);
    setRoom('');
    setShelf('');
    setRepairStatus('Good');
    setPurchasePriority('None');
    setImage(null);
  };

  return (
    <div className="tools-page-container">
      <h2 className="tools-heading">Tools Inventory</h2>

      <div className="tools-content-wrapper">
        {/* LIST OF TOOLS */}
        <div className="tools-list-container">
          <h3>Existing Tools</h3>
          {tools.map((tool) => (
            <div key={tool._id} className="tool-item-card">
              <strong className="tool-item-title">{tool.name}</strong>
              <p>
                <strong>Quantity:</strong> {tool.quantityOnHand}
              </p>
              <p>
                <strong>Part Number:</strong> {tool.partnum}
              </p>
              <p>
                <strong>Description:</strong> {tool.description}
              </p>
              <p>
                <strong>Repair Status:</strong> {tool.repairStatus}
              </p>
              <p>
                <strong>Priority:</strong> {tool.purchasePriority}
              </p>
              {/* Show an image if present */}
              {tool.imageUrl && (
                <img
                  src={tool.imageUrl}
                  alt={tool.name}
                  className="tool-image-thumb"
                />
              )}
              <div className="tool-button-row">
                <button
                  className="tool-button-primary"
                  onClick={() => handleEdit(tool)}
                >
                  Edit
                </button>
                <button
                  className="tool-button-secondary"
                  onClick={() => handleDelete(tool._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* TOOL FORM */}
        <div className="tools-form-container">
          <h3>{selectedTool ? 'Edit Tool' : 'Add New Tool'}</h3>
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="tools-form"
          >
            <div className="tools-form-group">
              <label>Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="tools-form-group">
              <label>Part Number:</label>
              <input
                type="text"
                value={partnum}
                onChange={(e) => setPartnum(e.target.value)}
                required
              />
            </div>
            <div className="tools-form-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="tools-form-group">
              <label>Quantity On Hand:</label>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
            <div className="tools-form-group">
              <label>Room:</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <div className="tools-form-group">
              <label>Shelf:</label>
              <input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
              />
            </div>
            <div className="tools-form-group">
              <label>Repair Status:</label>
              <select
                value={repairStatus}
                onChange={(e) => setRepairStatus(e.target.value)}
              >
                <option value="Good">Good</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Under Repair">Under Repair</option>
              </select>
            </div>
            <div className="tools-form-group">
              <label>Purchase Priority:</label>
              <select
                value={purchasePriority}
                onChange={(e) => setPurchasePriority(e.target.value)}
              >
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div className="tools-form-group">
              <label>Image (optional):</label>
              <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
              />
            </div>
            <div className="tools-form-button-row">
              <button type="submit" className="tool-button-primary">
                {selectedTool ? 'Update' : 'Create'}
              </button>
              {selectedTool && (
                <button
                  type="button"
                  className="tool-button-secondary"
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
