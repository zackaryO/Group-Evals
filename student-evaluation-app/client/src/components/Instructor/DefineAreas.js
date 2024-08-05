import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DefineAreas.css';
import URL from '../../backEndURL';

const DefineAreas = () => {
  const [areas, setAreas] = useState({
    area1: '',
    area2: '',
    area3: '',
    area4: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch current areas
    axios.get(`${URL}/api/areas`)
    // axios.get('http://localhost:5000/api/areas')      
      .then((response) => {
        setAreas(response.data);
      })
      .catch((error) => {
        console.error('Error fetching areas:', error);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAreas((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Determine if we need to set or update the areas
    axios.get(`${URL}/api/areas`)
    // axios.get('http://localhost:5000/api/areas')      
      .then((response) => {
        if (response.data) {
          // Areas already exist, update them
          axios.put(`${URL}/api/areas/update`, areas)
          // axios.put('http://localhost:5000/api/areas/update', areas)            
            .then((response) => {
              setMessage('Areas updated successfully!');
              console.log('Areas updated successfully:', response.data);
            })
            .catch((error) => {
              setMessage('Error updating areas');
              console.error('Error updating areas:', error);
            });
        } else {
          // Areas do not exist, create them
          axios.post(`${URL}/api/areas/set`, areas)
          // axios.post('http://localhost:5000/api/areas/set', areas)
            .then((response) => {
              setMessage('Areas set successfully!');
              console.log('Areas set successfully:', response.data);
            })
            .catch((error) => {
              setMessage('Error setting areas');
              console.error('Error setting areas:', error);
            });
        }
      })
      .catch((error) => {
        setMessage('Error fetching areas');
        console.error('Error fetching areas:', error);
      });
  };

  return (
    <div className="define-areas-container">
      <h2>Define Evaluation Areas</h2>
      {message && <p className="message">{message}</p>}
      <form onSubmit={handleSubmit}>
        <div className="field-container">
          <label>
            Area 1:
            <input
              type="text"
              name="area1"
              value={areas.area1}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <div className="field-container">
          <label>
            Area 2:
            <input
              type="text"
              name="area2"
              value={areas.area2}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <div className="field-container">
          <label>
            Area 3:
            <input
              type="text"
              name="area3"
              value={areas.area3}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <div className="field-container">
          <label>
            Area 4:
            <input
              type="text"
              name="area4"
              value={areas.area4}
              onChange={handleChange}
              required
            />
          </label>
        </div>
        <button type="submit">Set Areas</button>
      </form>
    </div>
  );
};

export default DefineAreas;
