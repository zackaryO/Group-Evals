/**
 * @file ToolsPage.jsx
 * @description React component for managing Tool records (CRUD) with optional image uploads to S3
 *              (via the backend). Displaying images is limited in max size for better UI.
 *              Now supports:
 *                - Clickable image thumbnails that open a large modal
 *                - Part number displayed in black
 *                - Clearing the file input when form resets
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
 * - Clicking a tool’s thumbnail image opens a modal with an enlarged view
 */
const ToolsPage = () => {
  // -------------------- STATE: Tools List --------------------
  /** All tool records fetched from the backend. */
  const [tools, setTools] = useState([]);

  /** The currently selected tool for editing (null = creating new). */
  const [selectedTool, setSelectedTool] = useState(null);

  // -------------------- STATE: Form Fields --------------------
  const [name, setName] = useState('');
  const [partnum, setPartnum] = useState('');
  const [description, setDescription] = useState('');
  const [quantityOnHand, setQuantityOnHand] = useState(1);
  const [room, setRoom] = useState('');
  const [shelf, setShelf] = useState('');
  const [repairStatus, setRepairStatus] = useState('Good');
  const [purchasePriority, setPurchasePriority] = useState('None');

  /** The file chosen for upload (if any). */
  const [image, setImage] = useState(null);

  /**
   * Key to force the file input to re-render (thus clearing it).
   * Increment it whenever we reset the form or change editing states.
   */
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  // -------------------- STATE: Modal for Enlarged Images --------------------
  /** If non-null, this is the URL of the image to show in the modal. */
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  const navigate = useNavigate();

  // -------------------- FETCHING TOOLS ON MOUNT --------------------
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
   * Handle form submission (create or update a tool).
   * Sends multipart/form-data if an image is present.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      // Prepare FormData for file upload
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
        // Update an existing tool
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
      resetForm(); // also clears the file input
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
   * Begin editing a tool (loads the tool data into the form).
   * @param {Object} tool - The tool to edit
   */
  const handleEdit = (tool) => {
    setSelectedTool(tool);
    setName(tool.name);
    setPartnum(tool.partnum || '');
    setDescription(tool.description || '');
    setQuantityOnHand(tool.quantityOnHand || 1);
    setRoom(tool.location?.room || '');
    setShelf(tool.location?.shelf || '');
    setRepairStatus(tool.repairStatus || 'Good');
    setPurchasePriority(tool.purchasePriority || 'None');

    // Clear old file from state
    setImage(null);
    // Force the file input to reset
    setFileInputKey(Date.now());
  };

  // -------------------- DELETE A TOOL --------------------
  /**
   * Delete a specific tool by ID.
   * @param {string} id - The tool's _id
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

  // -------------------- RESETTING THE FORM --------------------
  /**
   * Reset the form to a blank state (no tool selected).
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

    // Force <input type="file" /> to clear
    setFileInputKey(Date.now());
  };

  // -------------------- ENLARGED IMAGE MODAL --------------------
  /**
   * Opens the modal to show a larger image.
   * @param {string} url - The image URL
   */
  const handleImageClick = (url) => {
    setSelectedImageUrl(url);
  };

  /**
   * Close the modal.
   */
  const closeModal = () => {
    setSelectedImageUrl(null);
  };

  // -------------------- JSX RENDER --------------------
  return (
    <div className="tools-page-container">
      <h2 className="tools-heading">Tools Inventory</h2>

      <div className="tools-content-wrapper">
        {/* ========== LEFT SIDE: LIST OF TOOLS ========== */}
        <div className="tools-list-container">
          <h3>Existing Tools</h3>
          {tools.map((tool) => (
            <div key={tool._id} className="tool-item-card">
              <strong className="tool-item-title">{tool.name}</strong>
              <p style={{ color: '#000' }}>
                <strong>Part Number:</strong> {tool.partnum}
              </p>
              <p>
                <strong>Quantity:</strong> {tool.quantityOnHand}
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
          ))}
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
