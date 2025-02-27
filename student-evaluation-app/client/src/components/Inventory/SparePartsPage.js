/**
 * SparePartsPage.js
 *
 * Provides CRUD interface for SparePart records.
 * Endpoint: /api/spare-parts
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const SparePartsPage = () => {
  const styles = {
    pageContainer: {
      maxWidth: '1200px',
      margin: '2rem auto',
      background: '#fafafa',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    },
    heading: {
      textAlign: 'center',
      marginBottom: '1.5rem',
      color: '#333',
    },
    contentWrapper: {
      display: 'flex',
      gap: '2rem',
    },
    listContainer: {
      flex: 1,
    },
    itemCard: {
      background: '#fff',
      border: '1px solid #ddd',
      borderRadius: '6px',
      padding: '1rem',
      marginBottom: '1rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    itemTitle: {
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      color: '#555',
    },
    buttonRow: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1rem',
    },
    button: {
      background: '#007bff',
      color: '#fff',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    buttonSecondary: {
      background: '#6c757d',
      color: '#fff',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    imageThumb: {
      width: '80px',
      margin: '0.5rem 0',
      borderRadius: '4px',
      objectFit: 'cover',
      border: '1px solid #ddd',
    },
    formContainer: {
      flex: 1,
      background: '#fff',
      padding: '1rem',
      borderRadius: '6px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    formGroup: {
      marginBottom: '1rem',
    },
    label: {
      display: 'block',
      marginBottom: '0.4rem',
      fontWeight: '500',
      color: '#333',
    },
    input: {
      width: '100%',
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #ccc',
    },
    textarea: {
      width: '100%',
      minHeight: '60px',
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #ccc',
    },
    select: {
      width: '100%',
      padding: '0.5rem',
      borderRadius: '4px',
      border: '1px solid #ccc',
    },
    buttonRowForm: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1rem',
    },
  };

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
        await axios.put(`${URL}/api/spare-parts/${selectedPart._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
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
    <div style={styles.pageContainer}>
      <h2 style={styles.heading}>Spare Parts</h2>
      <div style={styles.contentWrapper}>
        {/* LIST OF SPARE PARTS */}
        <div style={styles.listContainer}>
          <h3>Existing Spare Parts</h3>
          {spareParts.map((part) => (
            <div key={part._id} style={styles.itemCard}>
              <p style={styles.itemTitle}>{part.partName}</p>
              <p><strong>Part #:</strong> {part.partNumber}</p>
              <p><strong>Qty:</strong> {part.quantityOnHand}</p>
              <p><strong>Repair Status:</strong> {part.repairStatus}</p>
              <p><strong>Priority:</strong> {part.purchasePriority}</p>
              {part.imageUrl && (
                <img
                  src={part.imageUrl}
                  alt={part.partName}
                  style={styles.imageThumb}
                />
              )}
              <div style={styles.buttonRow}>
                <button style={styles.button} onClick={() => handleEdit(part)}>Edit</button>
                <button
                  style={styles.buttonSecondary}
                  onClick={() => handleDelete(part._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div style={styles.formContainer}>
          <h3>{selectedPart ? 'Edit Spare Part' : 'Add New Spare Part'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div style={styles.formGroup}>
              <label style={styles.label}>Part Name:</label>
              <input
                style={styles.input}
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Part Number:</label>
              <input
                style={styles.input}
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description:</label>
              <textarea
                style={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Room:</label>
              <input
                style={styles.input}
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Shelf:</label>
              <input
                style={styles.input}
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Quantity On Hand:</label>
              <input
                style={styles.input}
                type="number"
                value={quantityOnHand}
                onChange={(e) => setQuantityOnHand(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Repair Status:</label>
              <select
                style={styles.select}
                value={repairStatus}
                onChange={(e) => setRepairStatus(e.target.value)}
              >
                <option value="Good">Good</option>
                <option value="Needs Repair">Needs Repair</option>
                <option value="Under Repair">Under Repair</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Purchase Priority:</label>
              <select
                style={styles.select}
                value={purchasePriority}
                onChange={(e) => setPurchasePriority(e.target.value)}
              >
                <option value="None">None</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Image:</label>
              <input
                style={styles.input}
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
              />
            </div>
            <div style={styles.buttonRowForm}>
              <button style={styles.button} type="submit">
                {selectedPart ? 'Update' : 'Create'}
              </button>
              {selectedPart && (
                <button
                  style={styles.buttonSecondary}
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
