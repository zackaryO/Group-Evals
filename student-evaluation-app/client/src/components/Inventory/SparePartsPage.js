/**
 * @file SparePartsPage.jsx
 * @description React component for managing SparePart records (CRUD) with optional image upload,
 *              using a phone-friendly layout.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './SparePartsPage.css';

const SparePartsPage = () => {
  const [spareParts, setSpareParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);

  // Form fields
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [room, setRoom] = useState('');
  const [shelf, setShelf] = useState('');
  const [quantityOnHand, setQuantityOnHand] = useState(0);
  const [repairStatus, setRepairStatus] = useState('Good');
  const [purchasePriority, setPurchasePriority] = useState('None');
  const [image, setImage] = useState(null);

  useEffect(() => {
    fetchSpareParts();
  }, []);

  /**
   * Fetch spare parts
   */
  const fetchSpareParts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${URL}/api/spare-parts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setSpareParts(data);
    } catch (error) {
      console.error('Error fetching spare parts:', error);
    }
  };

  /**
   * Handle create/update
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('partName', partName);
      formData.append('partNumber', partNumber);
      formData.append('description', description);
      formData.append('room', room);
      formData.append('shelf', shelf);
      formData.append('quantityOnHand', quantityOnHand);
      formData.append('repairStatus', repairStatus);
      formData.append('purchasePriority', purchasePriority);

      if (image) {
        formData.append('image', image);
      }

      if (selectedPart) {
        // Update
        await axios.put(`${URL}/api/spare-parts/${selectedPart._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
        await axios.post(`${URL}/api/spare-parts`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      fetchSpareParts();
    } catch (error) {
      console.error('Error saving spare part:', error);
    }
  };

  /**
   * Populate form for editing
   */
  const handleEdit = (part) => {
    setSelectedPart(part);
    setPartName(part.partName);
    setPartNumber(part.partNumber || '');
    setDescription(part.description || '');
    setRoom(part.location?.room || '');
    setShelf(part.location?.shelf || '');
    setQuantityOnHand(part.quantityOnHand || 0);
    setRepairStatus(part.repairStatus || 'Good');
    setPurchasePriority(part.purchasePriority || 'None');
    setImage(null);
  };

  /**
   * Delete spare part
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/spare-parts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSpareParts((prev) => prev.filter((p) => p._id !== id));
    } catch (error) {
      console.error('Error deleting spare part:', error);
    }
  };

  const resetForm = () => {
    setSelectedPart(null);
    setPartName('');
    setPartNumber('');
    setDescription('');
    setRoom('');
    setShelf('');
    setQuantityOnHand(0);
    setRepairStatus('Good');
    setPurchasePriority('None');
    setImage(null);
  };

  return (
    <div className="spare-page-container">
      <h2 className="spare-heading">Spare Parts</h2>
      <div className="spare-content-wrapper">
        {/* LIST */}
        <div className="spare-list-container">
          <h3>Existing Spare Parts</h3>
          {spareParts.map((part) => (
            <div key={part._id} className="spare-item-card">
              <p className="spare-item-title">{part.partName}</p>
              <p><strong>Part #:</strong> {part.partNumber}</p>
              <p><strong>Qty:</strong> {part.quantityOnHand}</p>
              <p><strong>Repair Status:</strong> {part.repairStatus}</p>
              <p><strong>Priority:</strong> {part.purchasePriority}</p>
              {part.imageUrl && (
                <img
                  src={part.imageUrl}
                  alt={part.partName}
                  className="spare-image-thumb"
                />
              )}
              <div className="spare-button-row">
                <button className="spare-button-primary" onClick={() => handleEdit(part)}>
                  Edit
                </button>
                <button
                  className="spare-button-secondary"
                  onClick={() => handleDelete(part._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div className="spare-form-container">
          <h3>{selectedPart ? 'Edit Spare Part' : 'Add New Spare Part'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data" className="spare-form">
            <div className="spare-form-group">
              <label>Part Name:</label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                required
              />
            </div>
            <div className="spare-form-group">
              <label>Part Number:</label>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
              />
            </div>
            <div className="spare-form-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="spare-form-group">
              <label>Room:</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <div className="spare-form-group">
              <label>Shelf:</label>
              <input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
              />
            </div>
            <div className="spare-form-group">
              <label>Quantity On Hand:</label>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
            <div className="spare-form-group">
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
            <div className="spare-form-group">
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
            <div className="spare-form-group">
              <label>Image:</label>
              <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
              />
            </div>
            <div className="spare-button-row-form">
              <button className="spare-button-primary" type="submit">
                {selectedPart ? 'Update' : 'Create'}
              </button>
              {selectedPart && (
                <button
                  className="spare-button-secondary"
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

export default SparePartsPage;
