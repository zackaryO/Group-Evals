/**
 * SparePartsPage.js
 *
 * Provides CRUD interface for SparePart records.
 * Fields: partName, partNumber, description, imageUrl, location (room, shelf),
 *         quantityOnHand, repairStatus, purchasePriority.
 *
 * Endpoint: /api/spare-parts
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';

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
   * Fetch all spare parts from server
   */
  const fetchSpareParts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/spare-parts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSpareParts(response.data);
    } catch (error) {
      console.error('Error fetching spare parts:', error);
    }
  };

  /**
   * Handle form submission (create or update)
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
        // Update existing
        await axios.put(`/api/spare-parts/${selectedPart._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Create new
        await axios.post('/api/spare-parts', formData, {
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
   * Delete part
   */
  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/spare-parts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSpareParts(spareParts.filter((p) => p._id !== id));
    } catch (error) {
      console.error('Error deleting spare part:', error);
    }
  };

  /**
   * Reset form to default
   */
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
    <div style={{ padding: '1rem' }}>
      <h2>Spare Parts</h2>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* List of spare parts */}
        <div style={{ flex: 1 }}>
          <h3>Existing Spare Parts</h3>
          {spareParts.map((part) => (
            <div
              key={part._id}
              style={{ border: '1px solid #ccc', marginBottom: '1rem', padding: '1rem' }}
            >
              <p><strong>Name:</strong> {part.partName}</p>
              <p><strong>Part #:</strong> {part.partNumber}</p>
              <p><strong>Qty:</strong> {part.quantityOnHand}</p>
              <p><strong>Repair Status:</strong> {part.repairStatus}</p>
              <p><strong>Priority:</strong> {part.purchasePriority}</p>
              {part.imageUrl && (
                <div>
                  <img src={part.imageUrl} alt={part.partName} style={{ width: '100px' }} />
                </div>
              )}
              <button onClick={() => handleEdit(part)}>Edit</button>
              <button onClick={() => handleDelete(part._id)}>Delete</button>
            </div>
          ))}
        </div>

        {/* Form */}
        <div style={{ flex: 1 }}>
          <h3>{selectedPart ? 'Edit Spare Part' : 'Add New Spare Part'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div>
              <label>Part Name:</label>
              <input
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Part Number:</label>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
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
            <button type="submit">{selectedPart ? 'Update' : 'Create'}</button>
            {selectedPart && <button onClick={resetForm}>Cancel</button>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default SparePartsPage;
