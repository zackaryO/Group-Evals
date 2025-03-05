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
 *      - Improved layout for tool rows (text + image + action buttons)
 *
 *   3. A right column for creating/updating a tool.
 *      - A user can change the tool's "drawer" field to move it around.
 *
 *   Additionally:
 *      - The left column never takes more than 1/3 of the screen on larger (desktop) layouts.
 *      - Drawer images are wrapped into multiple rows if there are many.
 *      - We have backend functionality to delete single drawer images (via DELETE /api/loaner-toolboxes/:id/drawer-images).
 *      - Large images load gracefully with a "Loading..." placeholder.
 *      - Stripped drawer filenames to recognized patterns ("Drawer 1", "Shelve 2", etc.).
 *      - **Now includes an "Expected Quantity" field** in the create/edit Tool form.
 */

import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './LoanerToolboxesPage.css';

/**
 * A small subcomponent to handle "graceful loading" of large drawer images.
 * Displays "Loading..." or "Failed to load" while waiting on the image.
 *
 * @param {Object} props - React props
 * @param {string} props.src - The image URL
 * @param {string} props.alt - The alt text for the image
 * @param {function} [props.onClick] - Optional handler for clicks (like opening a modal)
 * @returns {JSX.Element} The image or a placeholder
 */
function DrawerImageLoader({ src, alt, onClick }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="drawer-image-loader">
      {loading && !error && (
        <div className="drawer-image-loading">Loading...</div>
      )}
      {error && (
        <div className="drawer-image-fail">Failed to load</div>
      )}
      {!error && (
        <img
          src={src}
          alt={alt}
          className="drawer-image-thumb"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
          onClick={onClick}
          style={{ display: loading ? 'none' : 'block' }}
        />
      )}
    </div>
  );
}

/**
 * Parse a known name like "Drawer 1", "Shelve 2", or "Compartment 3" from a filename.
 * If no match is found, returns "".
 *
 * @param {string} baseName
 * @returns {string} e.g. "Drawer 2" or ""
 */
function parseKnownDrawerName(baseName) {
  const pattern = /\b(Drawer\s\d+|Shelve\s\d+|Compartment\s\d+)\b/i;
  const match = baseName.match(pattern);
  if (!match) return '';
  const recognized = match[0];
  return recognized.charAt(0).toUpperCase() + recognized.slice(1);
}

/**
 * Extract the recognized label from the URL's filename (minus extension).
 * e.g. "Drawer 2" if it matches, otherwise "".
 *
 * @param {string} imageUrl
 * @returns {string} - recognized label or ""
 */
function getDrawerLabel(imageUrl) {
  try {
    const parts = imageUrl.split('/');
    const lastSegment = parts[parts.length - 1];
    const dotIndex = lastSegment.lastIndexOf('.');
    const baseName = (dotIndex === -1)
      ? lastSegment
      : lastSegment.substring(0, dotIndex);

    return parseKnownDrawerName(baseName);
  } catch {
    return '';
  }
}

/**
 * Main LoanerToolboxesPage component.
 * 
 * @component
 * @returns {JSX.Element}
 */
const LoanerToolboxesPage = () => {
  // --------------------- STATE: Toolbox List ---------------------
  /**
   * @typedef {Object} Toolbox
   * @property {string} _id
   * @property {string} toolboxName
   * @property {string[]} drawerImages
   */

  /** All fetched toolboxes */
  const [toolboxes, setToolboxes] = useState([]);

  /** The currently selected toolbox (null if none). */
  const [selectedToolbox, setSelectedToolbox] = useState(null);

  // --------------------- STATE: Toolbox Create/Edit Form ---------------------
  const [editToolboxTarget, setEditToolboxTarget] = useState(null);
  const [toolboxName, setToolboxName] = useState('');
  const [drawerImages, setDrawerImages] = useState(null); // new images to add
  const [existingDrawerImages, setExistingDrawerImages] = useState([]); // editing

  // --------------------- STATE: Tools In vs Out ---------------------
  const [inTools, setInTools] = useState([]);
  const [outTools, setOutTools] = useState([]);

  // --------------------- STATE: Tool Create/Edit ---------------------
  const [editingToolId, setEditingToolId] = useState(null);
  const [toolName, setToolName] = useState('');
  const [partnum, setPartNum] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [toolQuantity, setToolQuantity] = useState(1);
  const [toolExpected, setToolExpected] = useState(1); // NEW: track expectedQuantity
  const [toolDrawer, setToolDrawer] = useState('');
  const [toolImage, setToolImage] = useState(null);

  // --------------------- STATE: Image Modal ---------------------
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  // --------------------- ON MOUNT: Fetch Toolboxes ---------------------
  useEffect(() => {
    fetchAllToolboxes();
  }, []);

  /**
   * Fetch all toolboxes from the server.
   * On success, set state to the array of toolboxes.
   * If error, log it.
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
   * Fetch the Tools that are in vs out of a particular toolbox, sorted by numeric drawer for inTools.
   * @param {Toolbox} toolbox
   */
  const fetchToolboxTools = async (toolbox) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${URL}/api/loaner-toolboxes/${toolbox._id}/tools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let inArr = res.data.inTools || [];
      let outArr = res.data.outTools || [];

      inArr.sort((a, b) => {
        const numA = parseInt(a.location?.room, 10) || 0;
        const numB = parseInt(b.location?.room, 10) || 0;
        return numA - numB;
      });

      setInTools(inArr);
      setOutTools(outArr);
    } catch (error) {
      console.error('Error fetching toolbox tools:', error);
      setInTools([]);
      setOutTools([]);
    }
  };

  // --------------------- Toolbox Select / Edit / Delete ---------------------
  /**
   * Select a toolbox (show in/out tools in the middle).
   * If editing a different box, reset that form.
   * @param {Toolbox} box
   */
  const handleSelectToolbox = (box) => {
    setSelectedToolbox(box);
    setInTools([]);
    setOutTools([]);
    fetchToolboxTools(box);

    if (editToolboxTarget && editToolboxTarget._id !== box._id) {
      resetToolboxForm();
    }
  };

  /**
   * Create or update a toolbox. 
   * Ensures at least 1 total drawer image (existing + new).
   * @param {Event} e
   */
  const handleSubmitToolbox = async (e) => {
    e.preventDefault();

    const totalImages =
      existingDrawerImages.length + (drawerImages ? drawerImages.length : 0);
    if (totalImages < 1) {
      alert('A toolbox must have at least 1 drawer image. Please add more.');
      return;
    }

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
        await axios.put(`${URL}/api/loaner-toolboxes/${editToolboxTarget._id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new
        await axios.post(`${URL}/api/loaner-toolboxes`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      resetToolboxForm();
      fetchAllToolboxes();
    } catch (error) {
      console.error('Error saving toolbox:', error);
    }
  };

  /**
   * Enter "edit" mode for an existing toolbox: populate existing images in local state.
   * @param {Toolbox} box
   */
  const handleEditToolbox = (box) => {
    setEditToolboxTarget(box);
    setToolboxName(box.toolboxName);
    setDrawerImages(null);
    setExistingDrawerImages(box.drawerImages || []);
  };

  /**
   * Reset the "edit toolbox" form to default.
   */
  const resetToolboxForm = () => {
    setEditToolboxTarget(null);
    setToolboxName('');
    setDrawerImages(null);
    setExistingDrawerImages([]);
  };

  /**
   * Delete a toolbox by ID, refresh the list, reset if necessary.
   * @param {string} toolboxId
   */
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

  // --------------------- Single Drawer Image Delete ---------------------
  /**
   * Delete a single drawer image from a toolbox (in edit mode).
   * Calls the new backend route: DELETE /api/loaner-toolboxes/:id/drawer-images
   * @param {string} imageUrl
   */
  const handleRemoveDrawerImage = async (imageUrl) => {
    if (!editToolboxTarget) return;
    if (!window.confirm('Are you sure you want to remove this image?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${URL}/api/loaner-toolboxes/${editToolboxTarget._id}/drawer-images`,
        {
          headers: { Authorization: `Bearer ${token}` },
          data: { imageUrl },
        }
      );

      // Locally remove that image from existingDrawerImages
      setExistingDrawerImages((prev) => prev.filter((img) => img !== imageUrl));
      // Refresh the entire toolboxes list so the left column is up to date
      fetchAllToolboxes();
    } catch (error) {
      console.error('Error removing drawer image:', error);
    }
  };

  // --------------------- Attach / Detach Tools ---------------------
  /**
   * Attach a tool to the selected toolbox, then refresh in/out Tools.
   * @param {string} toolId
   */
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

  /**
   * Detach a tool from the selected toolbox, then refresh in/out Tools.
   * @param {string} toolId
   */
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
  /**
   * Submit the "create/edit tool" form. 
   * Either updates an existing tool or creates a new one.
   * - Includes expectedQuantity in the form.
   *
   * @param {Event} e
   */
  const handleSubmitTool = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', toolName);
      formData.append('partnum', partnum);
      formData.append('description', toolDescription);
      formData.append('quantityOnHand', toolQuantity);
      formData.append('expectedQuantity', toolExpected); // NEW: send expectedQuantity
      formData.append('room', toolDrawer);

      if (toolImage) {
        formData.append('image', toolImage);
      }

      if (editingToolId) {
        // Update
        await axios.put(`${URL}/api/tools/${editingToolId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
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

  /**
   * Populate the "create/edit tool" form with data from an existing tool.
   * @param {Object} tool
   */
  const handleEditToolItem = (tool) => {
    setEditingToolId(tool._id);
    setToolName(tool.name || '');
    setPartNum(tool.partnum || '');
    setToolDescription(tool.description || '');
    setToolQuantity(tool.quantityOnHand || 1);
    setToolExpected(tool.expectedQuantity || 1); // NEW: load expectedQuantity
    setToolDrawer(tool.location?.room || '');
    setToolImage(null);
  };

  /**
   * Reset the "create/edit tool" form fields.
   */
  const resetToolForm = () => {
    setEditingToolId(null);
    setToolName('');
    setPartNum('');
    setToolDescription('');
    setToolQuantity(1);
    setToolExpected(1); // reset to 1
    setToolDrawer('');
    setToolImage(null);
  };

  // --------------------- Image Modal ---------------------
  /**
   * Show a larger version of a selected image in a modal overlay.
   * @param {string} url
   */
  const handleImageClick = (url) => {
    setSelectedImageUrl(url);
  };

  /**
   * Close the modal by clearing selectedImageUrl.
   */
  const closeModal = () => {
    setSelectedImageUrl(null);
  };

  // --------------------- Rendering Tools IN / OUT ---------------------
  /**
   * Render a single tool row with name, qty, drawer, optional image, attach/detach buttons,
   * plus missing info if quantityOnHand < expectedQuantity.
   *
   * @param {Object} tool
   * @param {boolean} isIn
   * @returns {JSX.Element}
   */
  const renderToolRow = (tool, isIn) => {
    const drawer = tool.location?.room || '';
    const expected = tool.expectedQuantity || 1;
    const missingCount = Math.max(0, expected - (tool.quantityOnHand || 0));
    return (
      <div key={tool._id} className="tool-row">
        <div className="tool-row-left">
          <div className="tool-row-title">{tool.name}</div>
          <div className="tool-row-details">
            Qty: {tool.quantityOnHand} / {expected}, Drawer: {drawer}
            {missingCount > 0 && (
              <div style={{ color: 'red' }}>
                Missing: {missingCount}
              </div>
            )}
          </div>
        </div>
        {tool.imageUrl && (
          <img
            src={tool.imageUrl}
            alt={tool.name}
            className="tool-thumb"
            onClick={() => handleImageClick(tool.imageUrl)}
          />
        )}
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

  /**
   * Render all "IN" tools or placeholders if none.
   * @returns {JSX.Element|JSX.Element[]}
   */
  const renderToolsInSelected = () => {
    if (!selectedToolbox) {
      return <p>No toolbox selected.</p>;
    }
    if (inTools.length === 0) {
      return <p>No tools in this toolbox.</p>;
    }
    return inTools.map((tool) => renderToolRow(tool, true));
  };

  /**
   * Render all "OUT" tools or placeholders if none.
   * @returns {JSX.Element|JSX.Element[]}
   */
  const renderToolsNotInSelected = () => {
    if (!selectedToolbox) {
      return <p>No toolbox selected.</p>;
    }
    if (outTools.length === 0) {
      return <p>All tools are in this toolbox.</p>;
    }
    return outTools.map((tool) => renderToolRow(tool, false));
  };

  // --------------------- Toggle + Draggable Columns (IN/OUT) ---------------------
  const [viewMode, setViewMode] = useState('both'); // can be "in", "out", or "both"
  const [inWidth, setInWidth] = useState(50); // left column width in percent
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);

  /**
   * Start dragging the vertical handle.
   * @param {Event} e
   */
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * While dragging, recalc the left column width.
   * @param {Event} e
   */
  const handleDragMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const clientX = e.type.includes('touch')
      ? e.touches[0].clientX
      : e.clientX;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerLeft = containerRect.left;
    const containerWidth = containerRect.width;

    let newInWidth = ((clientX - containerLeft) / containerWidth) * 100;
    if (newInWidth < 5) newInWidth = 5;
    if (newInWidth > 95) newInWidth = 95;
    setInWidth(newInWidth);
  };

  /**
   * Stop dragging on mouse/touch up.
   */
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Add global listeners for dragging
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

  // --------------------- RENDER ---------------------
  return (
    <div className="loaner-page-container">
      <h2 className="loaner-heading">
        Loaner Toolboxes - Two List (In/Out), Multiple Drawer Images
      </h2>

      <div className="loaner-content-wrapper">
        {/* ===== LEFT COLUMN: Toolbox List + Create/Edit Toolbox Form ===== */}
        <div className="loaner-left-col narrowed-left-col">
          <h3>Loaner Toolboxes</h3>
          <div className="loaner-scrollable-list">
            {toolboxes.map((box) => (
              <div key={box._id} className="loaner-item-card">
                <div>
                  <p className="loaner-item-title">{box.toolboxName}</p>
                  <div className="loaner-drawer-images reduced-gap" style={{ flexWrap: 'wrap' }}>
                    {box.drawerImages?.map((imgUrl, idx) => {
                      const recognizedLabel = getDrawerLabel(imgUrl);
                      return (
                        <div key={idx} className="drawer-image-container">
                          <DrawerImageLoader
                            src={imgUrl}
                            alt={`Drawer ${idx + 1}`}
                            onClick={() => {
                              /* open modal */
                              setSelectedImageUrl(imgUrl);
                            }}
                          />
                          {recognizedLabel && (
                            <div className="drawer-image-filename">
                              {recognizedLabel}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

          {/* Toolbox Form (Create/Edit) */}
          <div className="loaner-form-container">
            <h3>{editToolboxTarget ? 'Edit Toolbox' : 'Create Toolbox'}</h3>

            {editToolboxTarget && existingDrawerImages.length > 0 && (
              <div className="existing-drawers-section">
                <h4>Existing Drawer Images:</h4>
                <div className="existing-drawers-grid" style={{ flexWrap: 'wrap' }}>
                  {existingDrawerImages.map((imgUrl, idx) => {
                    const recognizedLabel = getDrawerLabel(imgUrl);
                    return (
                      <div key={idx} className="existing-drawer-item">
                        <DrawerImageLoader
                          src={imgUrl}
                          alt={`Drawer ${idx + 1}`}
                          onClick={() => setSelectedImageUrl(imgUrl)}
                        />
                        {recognizedLabel && (
                          <div className="drawer-image-filename">
                            {recognizedLabel}
                          </div>
                        )}
                        <button
                          type="button"
                          className="drawer-image-delete-btn"
                          onClick={() => handleRemoveDrawerImage(imgUrl)}
                        >
                          X
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmitToolbox}
              encType="multipart/form-data"
              className="loaner-form"
            >
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
                <label>Add More Drawer Images (multiple):</label>
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

        {/* ===== MIDDLE COLUMN: Tools In vs Tools Out ===== */}
        <div className="loaner-mid-col">
          <h3>
            {selectedToolbox
              ? `Tools for "${selectedToolbox.toolboxName}"`
              : 'No Toolbox Selected'}
          </h3>

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

          {viewMode === 'both' && (
            <div className="two-list-container" ref={containerRef}>
              <div
                className="two-list-column"
                style={{ width: `${inWidth}%` }}
              >
                <h4 className="two-list-title">Tools IN (Sorted by Drawer)</h4>
                <div className="loaner-scrollable-list tall">
                  {renderToolsInSelected()}
                </div>
              </div>

              <div
                className="drag-handle"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              />

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
              <label>Part/Item Number:</label>
              <input
                type="text"
                value={partnum}
                onChange={(e) => setPartNum(e.target.value)}
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

            {/* NEW: Expected Quantity Field */}
            <div className="loaner-form-group">
              <label>Expected Quantity:</label>
              <input
                type="number"
                value={toolExpected}
                onChange={(e) => setToolExpected(e.target.value)}
                min="1"
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
