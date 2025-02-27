/**
 * ConsumablesPage.js
 *
 * Provides CRUD interface for Consumable records.
 * Fields: name, imageUrl, location (room, shelf),
 *         quantityOnHand, desiredQuantity.
 *
 * Endpoint: /api/consumables
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

  useEffect(() => {
    fetchConsumables();
  }, []);

  /**
   * Fetch all consumables
   */
  const fetchConsumables = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/consumables', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConsumables(res.data);
    } catch (error) {
      console.error('Error fetching consumables:', error);
    }
  };

  /**
   * Handle form submit (create or update)
   */
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
        formData.append('image', image);
      }

      if (selectedConsumable) {
        // Update
        await axios.put(`/api/consumables/${selectedConsumable._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create
        await axios.post('/api/consumables', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      fetchConsumables();
    } catch (error) {
      console.error('Error saving consumable:', error);
    }
  };

  /**
   * Edit existing
   */
  const handleEdit = (c) => {
    setSelectedConsumable(c);
    setName(c.name);
    setRoom(c.location?.room || '');
    setShelf(c.location?.shelf || '');
    setQuantityOnHand(c.quantityOnHand || 0);
    setDesiredQuantity(c.desiredQuantity || 0);
    setImage(null);
  };

  /**
   * Delete consumable
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/consumables/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConsumables(consumables.filter((con) => con._id !== id));
    } catch (error) {
      console.error('Error deleting consumable:', error);
    }
  };

  /**
   * Reset form
   */
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
    <div style={{ padding: '1rem' }}>
      <h2>Consumables</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* List */}
        <div style={{ flex: 1 }}>
          <h3>Existing Consumables</h3>
          {consumables.map((item) => (
            <div
              key={item._id}
              style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}
            >
              <p><strong>Name:</strong> {item.name}</p>
              <p><strong>On Hand:</strong> {item.quantityOnHand}</p>
              <p><strong>Desired:</strong> {item.desiredQuantity}</p>
              {item.imageUrl && (
                <div>
                  <img src={item.imageUrl} alt={item.name} style={{ width: '100px' }} />
                </div>
              )}
              <button onClick={() => handleEdit(item)}>Edit</button>
              <button onClick={() => handleDelete(item._id)}>Delete</button>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          <h3>{selectedConsumable ? 'Edit Consumable' : 'Add New Consumable'}</h3>
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
              <label>Quantity On Hand:</label>
              <input
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
            <div>
              <label>Desired Quantity:</label>
              <input
                type="number"
                value={desiredQuantity}
                onChange={(e) => setDesiredQuantity(e.target.value)}
              />
            </div>
            <div>
              <label>Image:</label>
              <input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
              />
            </div>
            <button type="submit">{selectedConsumable ? 'Update' : 'Create'}</button>
            {selectedConsumable && <button onClick={resetForm}>Cancel</button>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ConsumablesPage;
