/**
 * @file ConsumablesPage.jsx
 * @description React component for managing Consumables (CRUD) with optional image uploads.
 *              Uses a phone-friendly layout similar to ToolsPage.
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL'; // Adjust if needed
import './ConsumablesPage.css';     // For phone-friendly layout

const ConsumablesPage = () => {
  const [consumables, setConsumables] = useState([]);
  const [selectedConsumable, setSelectedConsumable] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [shelf, setShelf] = useState('');
  const [quantityOnHand, setQuantityOnHand] = useState(0);
  const [desiredQuantity, setDesiredQuantity] = useState(0);
  const [image, setImage] = useState(null);

  // Fetch all consumables on mount
  useEffect(() => {
    fetchConsumables();
  }, []);

  const fetchConsumables = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${URL}/api/consumables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setConsumables(data);
    } catch (error) {
      console.error('Error fetching consumables:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('name', name);
      formData.append('room', room);
      formData.append('shelf', shelf);
      formData.append('quantityOnHand', quantityOnHand);
      formData.append('desiredQuantity', desiredQuantity);

      if (image) {
        formData.append('image', image); // must match uploadSingle('image') in the back end
      }

      if (selectedConsumable) {
        // Update
        await axios.put(`${URL}/api/consumables/${selectedConsumable._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
        await axios.post(`${URL}/api/consumables`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      fetchConsumables();
    } catch (error) {
      console.error('Error saving consumable:', error);
    }
  };

  const handleEdit = (item) => {
    setSelectedConsumable(item);
    setName(item.name);
    setRoom(item.location?.room || '');
    setShelf(item.location?.shelf || '');
    setQuantityOnHand(item.quantityOnHand || 0);
    setDesiredQuantity(item.desiredQuantity || 0);
    setImage(null);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${URL}/api/consumables/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConsumables((prev) => prev.filter((con) => con._id !== id));
    } catch (error) {
      console.error('Error deleting consumable:', error);
    }
  };

  const resetForm = () => {
    setSelectedConsumable(null);
    setName('');
    setRoom('');
    setShelf('');
    setQuantityOnHand(0);
    setDesiredQuantity(0);
    setImage(null);
  };

  return (
    <div className="cons-page-container">
      <h2 className="cons-heading">Consumables</h2>

      <div className="cons-content-wrapper">
        {/* LIST SECTION */}
        <div className="cons-list-container">
          <h3>Existing Consumables</h3>
          {consumables.map((item) => (
            <div key={item._id} className="cons-item-card">
              <p className="cons-item-title">{item.name}</p>
              <p><strong>On Hand:</strong> {item.quantityOnHand}</p>
              <p><strong>Desired:</strong> {item.desiredQuantity}</p>

              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="cons-image-thumb"
                />
              )}

              <div className="cons-button-row">
                <button
                  className="cons-button-primary"
                  onClick={() => handleEdit(item)}
                >
                  Edit
                </button>
                <button
                  className="cons-button-secondary"
                  onClick={() => handleDelete(item._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM SECTION */}
        <div className="cons-form-container">
          <h3>{selectedConsumable ? 'Edit Consumable' : 'Add New Consumable'}</h3>

          <form onSubmit={handleSubmit} encType="multipart/form-data" className="cons-form">
            <div className="cons-form-group">
              <label>Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="cons-form-group">
              <label>Room:</label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <div className="cons-form-group">
              <label>Shelf:</label>
              <input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
              />
            </div>
            <div className="cons-form-group">
              <label>Quantity On Hand:</label>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
            <div className="cons-form-group">
              <label>Desired Quantity:</label>
              <input
                type="number"
                value={desiredQuantity}
                onChange={(e) => setDesiredQuantity(e.target.value)}
              />
            </div>
            <div className="cons-form-group">
              <label>Image (optional):</label>
              <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                accept="image/*"
              />
            </div>

            <div className="cons-button-row-form">
              <button className="cons-button-primary" type="submit">
                {selectedConsumable ? 'Update' : 'Create'}
              </button>
              {selectedConsumable && (
                <button
                  className="cons-button-secondary"
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

export default ConsumablesPage;
