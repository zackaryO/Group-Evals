/**
 * @file ToolsPage.jsx
 * @description React component for managing Tool records (CRUD) with optional image uploads,
 *              now including an "expectedQuantity" field for tracking if some are missing.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import URL from '../../backEndURL'; // Adjust to your actual backend URL
import './ToolsPage.css'; // Import the CSS for styling

/**
 * ToolsPage Component
 * - Fetches and displays a list of tools from /api/tools
 * - Provides a form to create or edit a tool (including optional image upload)
 * - Includes an "expectedQuantity" field for missing-tool tracking
 * - Clicking a tool’s thumbnail image opens a modal with an enlarged view
 */
const ToolsPage = () => {
  // -------------------- STATE: Tools List --------------------
  const [tools, setTools] = useState([]);

  // Currently editing a specific tool (null = creating new)
  const [selectedTool, setSelectedTool] = useState(null);

  // -------------------- STATE: Form Fields --------------------
  const [name, setName] = useState('');
  const [partnum, setPartnum] = useState('');
  const [description, setDescription] = useState('');
  const [quantityOnHand, setQuantityOnHand] = useState(1);

  /**
   * A new state for "expectedQuantity":
   * The number of tools we *should* have, so "missing = expected - onHand" if that is positive.
   */
  const [expectedQuantity, setExpectedQuantity] = useState(1);

  const [room, setRoom] = useState('');
  const [shelf, setShelf] = useState('');
  const [repairStatus, setRepairStatus] = useState('Good');
  const [purchasePriority, setPurchasePriority] = useState('None');
  const [image, setImage] = useState(null);

  /** Key to reset file input (clear it). */
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  // Modal for enlarged image
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const navigate = useNavigate();

  // -------------------- FETCH TOOLS ON MOUNT --------------------
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

  // -------------------- CREATE or UPDATE --------------------
  /**
   * Handle form submission for creating or updating a Tool,
   * now sending "expectedQuantity" as well.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('partnum', partnum);
      formData.append('description', description);
      formData.append('quantityOnHand', quantityOnHand);
      formData.append('expectedQuantity', expectedQuantity); // new field
      formData.append('room', room);
      formData.append('shelf', shelf);
      formData.append('repairStatus', repairStatus);
      formData.append('purchasePriority', purchasePriority);
      if (image) {
        formData.append('image', image);
      }

      if (selectedTool) {
        // Update existing
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

  // -------------------- EDITING A TOOL --------------------
  /**
   * Begin editing a tool: load the tool data into the form, including expectedQuantity.
   */
  const handleEdit = (tool) => {
    setSelectedTool(tool);
    setName(tool.name);
    setPartnum(tool.partnum || '');
    setDescription(tool.description || '');
    setQuantityOnHand(tool.quantityOnHand || 1);
    setExpectedQuantity(tool.expectedQuantity || 1);
    setRoom(tool.location?.room || '');
    setShelf(tool.location?.shelf || '');
    setRepairStatus(tool.repairStatus || 'Good');
    setPurchasePriority(tool.purchasePriority || 'None');

    setImage(null);
    setFileInputKey(Date.now());
  };

  // -------------------- DELETE A TOOL --------------------
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

  // -------------------- RESET FORM --------------------
  const resetForm = () => {
    setSelectedTool(null);
    setName('');
    setPartnum('');
    setDescription('');
    setQuantityOnHand(1);
    setExpectedQuantity(1); // reset to 1
    setRoom('');
    setShelf('');
    setRepairStatus('Good');
    setPurchasePriority('None');
    setImage(null);
    setFileInputKey(Date.now());
  };

  // -------------------- IMAGE MODAL --------------------
  const handleImageClick = (url) => {
    setSelectedImageUrl(url);
  };

  const closeModal = () => {
    setSelectedImageUrl(null);
  };

  // -------------------- RENDER --------------------
  return (
    <div className="tools-page-container">
      <h2 className="tools-heading">Tools Inventory</h2>

      <div className="tools-content-wrapper">
        {/* ========== LEFT SIDE: LIST OF TOOLS ========== */}
        <div className="tools-list-container">
          <h3>Existing Tools</h3>
          {tools.map((tool) => {
            // Compute missing if expected > onHand
            const missingCount = Math.max(0, (tool.expectedQuantity || 1) - (tool.quantityOnHand || 0));
            return (
              <div key={tool._id} className="tool-item-card">
                <strong className="tool-item-title">{tool.name}</strong>
                <p style={{ color: '#000' }}>
                  <strong>Part Number:</strong> {tool.partnum}
                </p>
                <p>
                  <strong>Quantity On Hand:</strong> {tool.quantityOnHand}
                </p>
                <p>
                  <strong>Expected Quantity:</strong> {tool.expectedQuantity}
                </p>
                {missingCount > 0 && (
                  <p style={{ color: 'red' }}>
                    <strong>Missing:</strong> {missingCount}
                  </p>
                )}
                <p>
                  <strong>Description:</strong> {tool.description}
                </p>
                <p>
                  <strong>Repair Status:</strong> {tool.repairStatus}
                </p>
                <p>
                  <strong>Priority:</strong> {tool.purchasePriority}
                </p>
                {/* Show an image if present; make it clickable to open modal */}
                {tool.imageUrl && (
                  <img
                    src={tool.imageUrl}
                    alt={tool.name}
                    className="tool-image-thumb"
                    onClick={() => handleImageClick(tool.imageUrl)}
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
            );
          })}
        </div>

        {/* ========== RIGHT SIDE: TOOL FORM ========== */}
        <div className="tools-form-container">
          <h3>{selectedTool ? 'Edit Tool' : 'Add New Tool'}</h3>
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="tools-form"
          >
            {/* Name */}
            <div className="tools-form-group">
              <label>Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {/* Part Number */}
            <div className="tools-form-group">
              <label>Part Number:</label>
              <input
                type="text"
                value={partnum}
                onChange={(e) => setPartnum(e.target.value)}
                required
              />
            </div>
            {/* Description */}
            <div className="tools-form-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {/* Quantity on Hand */}
            <div className="tools-form-group">
              <label>Quantity On Hand:</label>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
            {/* Expected Quantity (New) */}
            <div className="tools-form-group">
              <label>Expected Quantity:</label>
              <input
                type="number"
                value={expectedQuantity}
                onChange={(e) => setExpectedQuantity(e.target.value)}
                min="1"
              />
            </div>
            {/* Room */}
            <div className="tools-form-group">
              <label>Room:</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            {/* Shelf */}
            <div className="tools-form-group">
              <label>Shelf:</label>
              <input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
              />
            </div>
            {/* Repair Status */}
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
            {/* Purchase Priority */}
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
            {/* Image Upload */}
            <div className="tools-form-group">
              <label>Image (optional):</label>
              <input
                key={fileInputKey}
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
              />
            </div>
            {/* Buttons */}
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

      {/* ========== MODAL for Enlarged Image ========== */}
      {selectedImageUrl && (
        <div className="image-modal-overlay" onClick={closeModal}>
          <div
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={selectedImageUrl} alt="Enlarged" />
            <button className="close-modal-btn" onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsPage;
