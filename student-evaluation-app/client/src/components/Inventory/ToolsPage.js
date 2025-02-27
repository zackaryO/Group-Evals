/**
 * ToolsPage.js
 * A React component that displays the list of tools,
 * allows creation, editing, and deletion.
 * Only accessible to instructors (enforced by backend route checks).
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ToolsPage = () => {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantityOnHand, setQuantityOnHand] = useState(0);
  const [room, setRoom] = useState('');
  const [shelf, setShelf] = useState('');
  const [repairStatus, setRepairStatus] = useState('Good');
  const [purchasePriority, setPurchasePriority] = useState('None');
  const [image, setImage] = useState(null);

  const navigate = useNavigate();

  // Fetch tools on component mount
  useEffect(() => {
    const fetchTools = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/tools', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTools(res.data);
      } catch (error) {
        console.error('Error fetching tools:', error);
        // Optionally redirect if unauthorized
        if (error.response && error.response.status === 401) {
          navigate('/login');
        }
      }
    };

    fetchTools();
  }, [navigate]);

  // Handle creating or updating a tool
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('quantityOnHand', quantityOnHand);
      formData.append('room', room);
      formData.append('shelf', shelf);
      formData.append('repairStatus', repairStatus);
      formData.append('purchasePriority', purchasePriority);
      if (image) {
        formData.append('image', image);
      }

      if (selectedTool) {
        // Update existing
        await axios.put(`/api/tools/${selectedTool._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new
        await axios.post('/api/tools', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      // Refresh list
      const refreshed = await axios.get('/api/tools', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTools(refreshed.data);
    } catch (error) {
      console.error('Error saving tool:', error);
    }
  };

  // Handle edit button
  const handleEdit = (tool) => {
    setSelectedTool(tool);
    setName(tool.name);
    setDescription(tool.description || '');
    setQuantityOnHand(tool.quantityOnHand || 0);
    setRoom(tool.location?.room || '');
    setShelf(tool.location?.shelf || '');
    setRepairStatus(tool.repairStatus || 'Good');
    setPurchasePriority(tool.purchasePriority || 'None');
    setImage(null);
  };

  // Handle delete
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/tools/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTools(tools.filter((t) => t._id !== id));
    } catch (error) {
      console.error('Error deleting tool:', error);
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedTool(null);
    setName('');
    setDescription('');
    setQuantityOnHand(0);
    setRoom('');
    setShelf('');
    setRepairStatus('Good');
    setPurchasePriority('None');
    setImage(null);
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Tools Inventory</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* LIST OF TOOLS */}
        <div style={{ flex: 1 }}>
          <h3>Existing Tools</h3>
          {tools.map((tool) => (
            <div key={tool._id} style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}>
              <p><strong>Name:</strong> {tool.name}</p>
              <p><strong>Quantity:</strong> {tool.quantityOnHand}</p>
              <p><strong>Repair Status:</strong> {tool.repairStatus}</p>
              <p><strong>Priority:</strong> {tool.purchasePriority}</p>
              {tool.imageUrl && (
                <div>
                  <img src={tool.imageUrl} alt={tool.name} style={{ width: '100px' }} />
                </div>
              )}
              <button onClick={() => handleEdit(tool)}>Edit</button>
              <button onClick={() => handleDelete(tool._id)}>Delete</button>
            </div>
          ))}
        </div>

        {/* TOOL FORM */}
        <div style={{ flex: 1 }}>
          <h3>{selectedTool ? 'Edit Tool' : 'Add New Tool'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div>
              <label>Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              <label>Quantity On Hand:</label>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
            <div>
              <label>Room:</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <div>
              <label>Shelf:</label>
              <input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
              />
            </div>
            <div>
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
            <div>
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

export default ToolsPage;
