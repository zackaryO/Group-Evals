/**
 * @file LoanerToolboxesPage.jsx
 * @description React component that displays:
 *  - A list of LoanerToolboxes (scrollable)
 *    - "Select" for focusing on attach/detach
 *    - "Edit" for updating the toolbox name/drawer images
 *    - "Delete"
 *  - A middle column showing "Tools IN this toolbox" (sorted by drawer) and "Available Tools OUT"
 *    - "Detach" or "Attach" with one click
 *  - A right column for editing or creating a Tool (including an "Edit" button in each list).
 *  - The user can change a Tool's "drawer" field to effectively "move" it from one drawer to another.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './LoanerToolboxesPage.css';

const LoanerToolboxesPage = () => {
  // =================== STATE: Toolbox List ===================
  const [toolboxes, setToolboxes] = useState([]);
  // For selecting a toolbox to see the two-list Tools
  const [selectedToolbox, setSelectedToolbox] = useState(null);

  // For editing an existing or creating a new Toolbox
  const [editToolboxTarget, setEditToolboxTarget] = useState(null);
  const [toolboxName, setToolboxName] = useState('');
  const [drawerImages, setDrawerImages] = useState(null);

  // =================== STATE: Tools for "IN" vs "OUT" ===================
  const [inTools, setInTools] = useState([]);
  const [outTools, setOutTools] = useState([]);

  // =================== STATE: Tool Create/Edit ===================
  const [editingToolId, setEditingToolId] = useState(null);
  const [toolName, setToolName] = useState('');
  const [toolDescription, setToolDescription] = useState('');
  const [toolQuantity, setToolQuantity] = useState(1);
  const [toolRepairStatus, setToolRepairStatus] = useState('Good');
  const [toolDrawer, setToolDrawer] = useState('');
  const [toolImage, setToolImage] = useState(null);

  // =================== FETCHING on Mount ===================
  useEffect(() => {
    fetchAllToolboxes();
  }, []);

  /**
   * Fetch a list of all LoanerToolboxes (basic data)
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
   * Fetch { inTools, outTools } for a chosen toolbox
   */
  const fetchToolboxTools = async (toolbox) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${URL}/api/loaner-toolboxes/${toolbox._id}/tools`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let inArr = res.data.inTools || [];
      let outArr = res.data.outTools || [];
      // Sort the "IN" array by tool.location.room
      inArr.sort((a, b) => {
        const roomA = a.location?.room?.toLowerCase() || '';
        const roomB = b.location?.room?.toLowerCase() || '';
        return roomA.localeCompare(roomB);
      });
      setInTools(inArr);
      setOutTools(outArr);
    } catch (error) {
      console.error('Error fetching toolbox tools:', error);
      setInTools([]);
      setOutTools([]);
    }
  };

  // ============== Toolbox Select / Edit / Delete ==============
  const handleSelectToolbox = (box) => {
    setSelectedToolbox(box);
    setInTools([]);
    setOutTools([]);
    fetchToolboxTools(box);
    // If we are editing a different toolbox, reset that form
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
        // Update
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

  // ============== Attach / Detach Tools ==============
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

  // ============== Tool Create / Edit ==============
  const handleSubmitTool = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', toolName);
      formData.append('description', toolDescription);
      formData.append('quantityOnHand', toolQuantity);
      formData.append('repairStatus', toolRepairStatus);
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
      // If a toolbox is selected, re-fetch the in/out lists
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
    setToolRepairStatus(tool.repairStatus || 'Good');
    setToolDrawer(tool.location?.room || '');
    setToolImage(null);
  };

  const resetToolForm = () => {
    setEditingToolId(null);
    setToolName('');
    setToolDescription('');
    setToolQuantity(1);
    setToolRepairStatus('Good');
    setToolDrawer('');
    setToolImage(null);
  };

  // ============== Rendering In and Out Tools ==============
  const renderToolsInSelected = () => {
    if (!selectedToolbox) {
      return <p>No toolbox selected.</p>;
    }
    if (inTools.length === 0) {
      return <p>No tools in this toolbox.</p>;
    }
    return inTools.map((tool) => {
      const drawer = tool.location?.room || '';
      return (
        <div key={tool._id} className="tool-row">
          <div>
            <strong>{tool.name}</strong>
            (Qty: {tool.quantityOnHand}, Status: {tool.repairStatus}, Drawer: {drawer})
            {tool.imageUrl && (
              <img
                src={tool.imageUrl}
                alt={tool.name}
                className="small-thumb"
              />
            )}
          </div>
          <div className="loaner-button-row">
            <button
              className="loaner-button-secondary"
              onClick={() => handleEditToolItem(tool)}
            >
              Edit
            </button>
            <button
              className="loaner-button-secondary"
              onClick={() => handleDetachTool(tool._id)}
            >
              Detach
            </button>
          </div>
        </div>
      );
    });
  };

  const renderToolsNotInSelected = () => {
    if (!selectedToolbox) {
      return <p>No toolbox selected.</p>;
    }
    if (outTools.length === 0) {
      return <p>All tools are in this toolbox.</p>;
    }
    return outTools.map((tool) => {
      const drawer = tool.location?.room || '';
      return (
        <div key={tool._id} className="tool-row">
          <div>
            <strong>{tool.name}</strong>
            (Qty: {tool.quantityOnHand}, Status: {tool.repairStatus}, Drawer: {drawer})
            {tool.imageUrl && (
              <img
                src={tool.imageUrl}
                alt={tool.name}
                className="small-thumb"
              />
            )}
          </div>
          <div className="loaner-button-row">
            <button
              className="loaner-button-secondary"
              onClick={() => handleEditToolItem(tool)}
            >
              Edit
            </button>
            <button
              className="loaner-button-primary"
              onClick={() => handleAttachTool(tool._id)}
            >
              Attach
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="loaner-page-container">
      <h2 className="loaner-heading">Loaner Toolboxes - Two List (In/Out), Sorted by Drawer</h2>
      <div className="loaner-content-wrapper">
        {/* ===== LEFT COLUMN: Toolbox List, plus Create/Edit Form ===== */}
        <div className="loaner-left-col">
          <h3>Loaner Toolboxes</h3>
          <div className="loaner-scrollable-list">
            {toolboxes.map((box) => (
              <div key={box._id} className="loaner-item-card">
                <p className="loaner-item-title">{box.toolboxName}</p>
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

          {/* Toolbox Form */}
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

        {/* ===== MIDDLE COLUMN: Tools In vs Out ===== */}
        <div className="loaner-mid-col">
          <h3>{selectedToolbox ? `Tools for "${selectedToolbox.toolboxName}"` : 'No Toolbox Selected'}</h3>
          <div className="two-list-container">
            {/* Tools "IN" */}
            <div className="two-list-column">
              <h4 className="two-list-title">Tools IN Toolbox (Sorted by Drawer)</h4>
              <div className="loaner-scrollable-list tall">
                {renderToolsInSelected()}
              </div>
            </div>
            {/* Tools "OUT" */}
            <div className="two-list-column">
              <h4 className="two-list-title">Available Tools (OUT)</h4>
              <div className="loaner-scrollable-list tall">
                {renderToolsNotInSelected()}
              </div>
            </div>
          </div>
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
              <label>Repair Status:</label>
              <select
                value={toolRepairStatus}
                onChange={(e) => setToolRepairStatus(e.target.value)}
              >
                <option value="Good">Good</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Under Repair">Under Repair</option>
              </select>
            </div>
            <div className="loaner-form-group">
              <label>Drawer:</label>
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
    </div>
  );
};

export default LoanerToolboxesPage;
