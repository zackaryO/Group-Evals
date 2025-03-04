/**
 * @file LoanerToolboxesPage.jsx
 * @description React component that displays:
 *   1. A list of LoanerToolboxes (scrollable, left column).
 *      - "Select" for focusing on attaching/detaching tools.
 *      - "Edit" for updating the toolbox name and drawer images.
 *      - "Delete" to remove the toolbox entirely.
 *
 *   2. A middle column showing:
 *      - "Tools IN this toolbox" (sorted by numeric drawer) in one sub-column
 *      - "Available Tools OUT" in another sub-column
 *      - A drag handle between these two sub-columns to resize them
 *      - Buttons to toggle between viewing just IN, just OUT, or BOTH
 *      - **Improved layout for tool rows** (text + image + action buttons)
 *
 *   3. A right column for creating/updating a tool.
 *      - A user can change the tool's "drawer" field to move it around.
 *
 *   Additionally:
 *      - No tool "condition" or "repair status".
 *      - Images open in a large popup modal when clicked.
 *      - Works well on phone screens (responsive design).
 */

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './LoanerToolboxesPage.css';

/**
 * Main LoanerToolboxesPage component
 * @component
 */
const LoanerToolboxesPage = () => {
  // --------------------- STATE: Toolbox List ---------------------
  /**
   * @typedef {Object} Toolbox
   * @property {string} _id - Unique ID
   * @property {string} toolboxName - Display name
   * @property {string[]} [drawerImages] - URLs for drawer images
   */

  /** All fetched toolboxes. */
  const [toolboxes, setToolboxes] = useState([]);

  /** Currently selected toolbox (null if none). */
  const [selectedToolbox, setSelectedToolbox] = useState(null);

  // --------------------- STATE: Toolbox Form ---------------------
  /** The toolbox being edited (null = create new). */
  const [editToolboxTarget, setEditToolboxTarget] = useState(null);

  /** Toolbox name in the form. */
  const [toolboxName, setToolboxName] = useState('');

  /** FileList of drawer images selected. */
  const [drawerImages, setDrawerImages] = useState(null);

  // --------------------- STATE: Tools In vs Out ---------------------
  /** Tools currently IN the selected toolbox. */
  const [inTools, setInTools] = useState([]);

  /** Tools NOT in the selected toolbox (available to attach). */
  const [outTools, setOutTools] = useState([]);

  // --------------------- STATE: Tool Create/Edit ---------------------
  /** The ID of the tool being edited (null = creating new). */
  const [editingToolId, setEditingToolId] = useState(null);

  /** Fields for name, description, quantity, drawer, image file. */
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [toolQuantity, setToolQuantity] = useState(1);
  const [toolDrawer, setToolDrawer] = useState('');
  const [toolImage, setToolImage] = useState(null);

  // --------------------- STATE: Image Modal ---------------------
  /** URL of the image to show enlarged; null if no modal open. */
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  // --------------------- FETCHING ON MOUNT ---------------------
  useEffect(() => {
    fetchAllToolboxes();
  }, []);

  /**
   * Fetch all toolboxes from the server.
   * @async
   */
  const fetchAllToolboxes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${URL}/api/loaner-toolboxes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(res.data)) {
        setToolboxes(res.data);
      }
    } catch (error) {
      console.error('Error fetching toolboxes:', error);
    }
  };

  /**
   * Fetch tools in/out for a chosen toolbox, sorted by numeric drawer in the "IN" list.
   * @async
   */
  const fetchToolboxTools = async (toolbox) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${URL}/api/loaner-toolboxes/${toolbox._id}/tools`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let inArr = res.data.inTools || [];
      let outArr = res.data.outTools || [];

      // Sort by numeric drawer
      inArr.sort((a, b) => {
        const dA = parseInt(a.location?.room, 10) || 0;
        const dB = parseInt(b.location?.room, 10) || 0;
        return dA - dB;
      });

      setInTools(inArr);
      setOutTools(outArr);
    } catch (error) {
      console.error('Error fetching toolbox tools:', error);
      setInTools([]);
      setOutTools([]);
    }
  };

  // --------------------- Toolbox Handlers ---------------------
  const handleSelectToolbox = (box) => {
    setSelectedToolbox(box);
    setInTools([]);
    setOutTools([]);
    fetchToolboxTools(box);

    // If editing a different toolbox, reset
    if (editToolboxTarget && editToolboxTarget._id !== box._id) {
      resetToolboxForm();
    }
  };

  const handleSubmitToolbox = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('toolboxName', toolboxName);

      if (drawerImages) {
        for (let i = 0; i < drawerImages.length; i++) {
          formData.append('drawerImages', drawerImages[i]);
        }
      }

      if (editToolboxTarget) {
        // Update existing
        await axios.put(
          `${URL}/api/loaner-toolboxes/${editToolboxTarget._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new
        await axios.post(`${URL}/api/loaner-toolboxes`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetToolboxForm();
      fetchAllToolboxes();
    } catch (error) {
      console.error('Error saving toolbox:', error);
    }
  };

  const handleEditToolbox = (box) => {
    setEditToolboxTarget(box);
    setToolboxName(box.toolboxName);
    setDrawerImages(null);
  };

  const resetToolboxForm = () => {
    setEditToolboxTarget(null);
    setToolboxName('');
    setDrawerImages(null);
  };

  const handleDeleteToolbox = async (toolboxId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/loaner-toolboxes/${toolboxId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (editToolboxTarget && editToolboxTarget._id === toolboxId) {
        resetToolboxForm();
      }
      if (selectedToolbox && selectedToolbox._id === toolboxId) {
        setSelectedToolbox(null);
        setInTools([]);
        setOutTools([]);
      }
      fetchAllToolboxes();
    } catch (error) {
      console.error('Error deleting toolbox:', error);
    }
  };

  // --------------------- Attach / Detach Tools ---------------------
  const handleAttachTool = async (toolId) => {
    if (!selectedToolbox) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${URL}/api/loaner-toolboxes/${selectedToolbox._id}/attach-tool`,
        { toolId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchToolboxTools(selectedToolbox);
    } catch (error) {
      console.error('Error attaching tool:', error);
    }
  };

  const handleDetachTool = async (toolId) => {
    if (!selectedToolbox) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${URL}/api/loaner-toolboxes/${selectedToolbox._id}/detach-tool`,
        { toolId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchToolboxTools(selectedToolbox);
    } catch (error) {
      console.error('Error detaching tool:', error);
    }
  };

  // --------------------- Create / Edit Tool ---------------------
  const handleSubmitTool = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', toolName);
      formData.append('description', toolDescription);
      formData.append('quantityOnHand', toolQuantity);
      formData.append('room', toolDrawer); // numeric drawer

      if (toolImage) {
        formData.append('image', toolImage);
      }

      if (editingToolId) {
        // Update
        await axios.put(`${URL}/api/tools/${editingToolId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new
        await axios.post(`${URL}/api/tools`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      resetToolForm();
      if (selectedToolbox) {
        fetchToolboxTools(selectedToolbox);
      }
    } catch (error) {
      console.error('Error saving tool:', error);
    }
  };

  const handleEditToolItem = (tool) => {
    setEditingToolId(tool._id);
    setToolName(tool.name || '');
    setToolDescription(tool.description || '');
    setToolQuantity(tool.quantityOnHand || 1);
    setToolDrawer(tool.location?.room || '');
    setToolImage(null);
  };

  const resetToolForm = () => {
    setEditingToolId(null);
    setToolName('');
    setToolDescription('');
    setToolQuantity(1);
    setToolDrawer('');
    setToolImage(null);
  };

  // --------------------- Image Modal ---------------------
  const handleImageClick = (url) => {
    setSelectedImageUrl(url);
  };

  const closeModal = () => {
    setSelectedImageUrl(null);
  };

  // --------------------- Rendering Tools IN / OUT with improved layout ---------------------
  /**
   * A helper to render the single "row" for a tool item with consistent layout.
   * @param {Object} tool
   * @param {Boolean} isIn - If true, we show "Detach" button; otherwise "Attach"
   */
  const renderToolRow = (tool, isIn) => {
    const drawer = tool.location?.room || '';
    return (
      <div key={tool._id} className="tool-row">
        {/* Left section: text info */}
        <div className="tool-row-left">
          <div className="tool-row-title">
            {tool.name}
          </div>
          <div className="tool-row-details">
            Qty: {tool.quantityOnHand}, Drawer: {drawer}
          </div>
        </div>

        {/* Optional image on the right (within the same row or wrapping on mobile) */}
        {tool.imageUrl && (
          <img
            src={tool.imageUrl}
            alt={tool.name}
            className="tool-thumb"
            onClick={() => handleImageClick(tool.imageUrl)}
          />
        )}

        {/* Action buttons */}
        <div className="tool-row-actions">
          <button
            className="loaner-button-secondary"
            onClick={() => handleEditToolItem(tool)}
          >
            Edit
          </button>
          {isIn ? (
            <button
              className="loaner-button-secondary"
              onClick={() => handleDetachTool(tool._id)}
            >
              Detach
            </button>
          ) : (
            <button
              className="loaner-button-primary"
              onClick={() => handleAttachTool(tool._id)}
            >
              Attach
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderToolsInSelected = () => {
    if (!selectedToolbox) {
      return <p>No toolbox selected.</p>;
    }
    if (inTools.length === 0) {
      return <p>No tools in this toolbox.</p>;
    }
    return inTools.map((tool) => renderToolRow(tool, true));
  };

  const renderToolsNotInSelected = () => {
    if (!selectedToolbox) {
      return <p>No toolbox selected.</p>;
    }
    if (outTools.length === 0) {
      return <p>All tools are in this toolbox.</p>;
    }
    return outTools.map((tool) => renderToolRow(tool, false));
  };

  // --------------------- Toggle + Resizable Columns ---------------------
  /**
   * viewMode can be "in", "out", or "both".
   * - "in": show only Tools IN
   * - "out": show only Tools OUT
   * - "both": show both side by side
   */
  const [viewMode, setViewMode] = useState('both');

  /** The user can drag a handle in the middle to resize the two sub-columns. */
  const [inWidth, setInWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const clientX = e.type.includes('touch')
      ? e.touches[0].clientX
      : e.clientX;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerLeft = containerRect.left;
    const containerWidth = containerRect.width;

    let newInWidth = ((clientX - containerLeft) / containerWidth) * 100;

    // Clamp between 5% and 95%:
    if (newInWidth < 5) newInWidth = 5;
    if (newInWidth > 95) newInWidth = 95;
    setInWidth(newInWidth);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchend', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // --------------------- JSX RETURN ---------------------
  return (
    <div className="loaner-page-container">
      <h2 className="loaner-heading">Loaner Toolboxes - Two List (In/Out), Sorted by Drawer</h2>

      <div className="loaner-content-wrapper">
        {/* ===== LEFT COLUMN: Toolbox List + Create/Edit Toolbox Form ===== */}
        <div className="loaner-left-col">
          <h3>Loaner Toolboxes</h3>
          <div className="loaner-scrollable-list">
            {toolboxes.map((box) => (
              <div key={box._id} className="loaner-item-card">
                <div>
                  <p className="loaner-item-title">{box.toolboxName}</p>
                  <div className="loaner-drawer-images">
                    {box.drawerImages?.map((imgUrl, idx) => (
                      <img
                        key={idx}
                        src={imgUrl}
                        alt={`Drawer ${idx + 1}`}
                        className="drawer-image-thumb"
                        onClick={() => handleImageClick(imgUrl)}
                      />
                    ))}
                  </div>
                </div>
                <div className="loaner-button-row">
                  <button
                    className="loaner-button-primary"
                    onClick={() => handleSelectToolbox(box)}
                  >
                    Select
                  </button>
                  <button
                    className="loaner-button-secondary"
                    onClick={() => handleEditToolbox(box)}
                  >
                    Edit
                  </button>
                  <button
                    className="loaner-button-secondary"
                    onClick={() => handleDeleteToolbox(box._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Toolbox Create/Edit Form */}
          <div className="loaner-form-container">
            <h3>{editToolboxTarget ? 'Edit Toolbox' : 'Create Toolbox'}</h3>
            <form onSubmit={handleSubmitToolbox} encType="multipart/form-data" className="loaner-form">
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
              <div className="loaner-button-row-form">
                <button className="loaner-button-primary" type="submit">
                  {editToolboxTarget ? 'Update Toolbox' : 'Create Toolbox'}
                </button>
                {editToolboxTarget && (
                  <button
                    type="button"
                    className="loaner-button-secondary"
                    onClick={resetToolboxForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ===== MIDDLE COLUMN: Tools In / Tools Out ===== */}
        <div className="loaner-mid-col">
          <h3>{selectedToolbox ? `Tools for "${selectedToolbox.toolboxName}"` : 'No Toolbox Selected'}</h3>

          {/* Toggle buttons for "IN" / "OUT" / "BOTH" */}
          <div className="toggle-buttons-row">
            <button
              className={viewMode === 'in' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setViewMode('in')}
            >
              Show IN
            </button>
            <button
              className={viewMode === 'out' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setViewMode('out')}
            >
              Show OUT
            </button>
            <button
              className={viewMode === 'both' ? 'toggle-btn active' : 'toggle-btn'}
              onClick={() => setViewMode('both')}
            >
              Show BOTH
            </button>
          </div>

          {/* The two-list container is only visible if viewMode === 'both'. */}
          {viewMode === 'both' && (
            <div className="two-list-container" ref={containerRef}>
              {/* IN column */}
              <div
                className="two-list-column"
                style={{ width: `${inWidth}%` }}
              >
                <h4 className="two-list-title">Tools IN (Sorted by Drawer)</h4>
                <div className="loaner-scrollable-list tall">
                  {renderToolsInSelected()}
                </div>
              </div>

              {/* Resizable drag handle */}
              <div
                className="drag-handle"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              />

              {/* OUT column */}
              <div
                className="two-list-column"
                style={{ width: `${100 - inWidth}%` }}
              >
                <h4 className="two-list-title">Available Tools (OUT)</h4>
                <div className="loaner-scrollable-list tall">
                  {renderToolsNotInSelected()}
                </div>
              </div>
            </div>
          )}

          {/* Single column if viewMode === 'in' or 'out' */}
          {viewMode === 'in' && (
            <div className="single-list-container">
              <h4 className="two-list-title">Tools IN (Sorted by Drawer)</h4>
              <div className="loaner-scrollable-list tall">
                {renderToolsInSelected()}
              </div>
            </div>
          )}

          {viewMode === 'out' && (
            <div className="single-list-container">
              <h4 className="two-list-title">Available Tools (OUT)</h4>
              <div className="loaner-scrollable-list tall">
                {renderToolsNotInSelected()}
              </div>
            </div>
          )}
        </div>

        {/* ===== RIGHT COLUMN: Create/Edit Tool ===== */}
        <div className="loaner-right-col">
          <h3>{editingToolId ? 'Edit Tool' : 'Create New Tool'}</h3>
          <form onSubmit={handleSubmitTool} encType="multipart/form-data" className="loaner-form">
            <div className="loaner-form-group">
              <label>Name:</label>
              <input
                type="text"
                value={toolName}
                onChange={(e) => setToolName(e.target.value)}
                required
              />
            </div>
            <div className="loaner-form-group">
              <label>Description:</label>
              <input
                type="text"
                value={toolDescription}
                onChange={(e) => setToolDescription(e.target.value)}
              />
            </div>
            <div className="loaner-form-group">
              <label>Quantity On Hand:</label>
              <input
                type="number"
                value={toolQuantity}
                onChange={(e) => setToolQuantity(e.target.value)}
              />
            </div>
            <div className="loaner-form-group">
              <label>Drawer (numeric):</label>
              <input
                type="text"
                value={toolDrawer}
                onChange={(e) => setToolDrawer(e.target.value)}
              />
            </div>
            <div className="loaner-form-group">
              <label>Tool Image (optional):</label>
              <input
                type="file"
                onChange={(e) => setToolImage(e.target.files[0])}
                accept="image/*"
              />
            </div>
            <div className="loaner-button-row-form">
              <button className="loaner-button-primary" type="submit">
                {editingToolId ? 'Update Tool' : 'Create Tool'}
              </button>
              <button
                type="button"
                className="loaner-button-secondary"
                onClick={resetToolForm}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ===== MODAL for Enlarged Image ===== */}
      {selectedImageUrl && (
        <div className="image-modal-overlay" onClick={closeModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
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

export default LoanerToolboxesPage;
