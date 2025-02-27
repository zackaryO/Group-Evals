import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ConsumablesPage = () => {
  // --- Inline style objects (same snippet as above) ---
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
      overflowY: 'auto',
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
  };
  // ----------------------------------------------------

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

  const fetchConsumables = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/consumables', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ensure the result is an array:
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
        formData.append('image', image);
      }

      if (selectedConsumable) {
        await axios.put(`/api/consumables/${selectedConsumable._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
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

  const handleEdit = (c) => {
    setSelectedConsumable(c);
    setName(c.name);
    setRoom(c.location?.room || '');
    setShelf(c.location?.shelf || '');
    setQuantityOnHand(c.quantityOnHand || 0);
    setDesiredQuantity(c.desiredQuantity || 0);
    setImage(null);
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/consumables/${id}`, {
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
    <div style={styles.pageContainer}>
      <h2 style={styles.heading}>Consumables</h2>
      <div style={styles.contentWrapper}>
        {/* LIST */}
        <div style={styles.listContainer}>
          <h3>Existing Consumables</h3>
          {consumables.map((item) => (
            <div key={item._id} style={styles.itemCard}>
              <p style={styles.itemTitle}>{item.name}</p>
              <p><strong>On Hand:</strong> {item.quantityOnHand}</p>
              <p><strong>Desired:</strong> {item.desiredQuantity}</p>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  style={styles.imageThumb}
                />
              )}
              <div style={styles.buttonRow}>
                <button style={styles.button} onClick={() => handleEdit(item)}>Edit</button>
                <button style={styles.buttonSecondary} onClick={() => handleDelete(item._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div style={styles.formContainer}>
          <h3>{selectedConsumable ? 'Edit Consumable' : 'Add New Consumable'}</h3>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div style={styles.formGroup}>
              <label style={styles.label}>Name:</label>
              <input
                style={styles.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
              <label style={styles.label}>Desired Quantity:</label>
              <input
                style={styles.input}
                type="number"
                value={desiredQuantity}
                onChange={(e) => setDesiredQuantity(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Image:</label>
              <input
                style={styles.input}
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
              />
            </div>
            <div style={styles.buttonRow}>
              <button style={styles.button} type="submit">
                {selectedConsumable ? 'Update' : 'Create'}
              </button>
              {selectedConsumable && (
                <button style={styles.buttonSecondary} onClick={resetForm} type="button">
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
