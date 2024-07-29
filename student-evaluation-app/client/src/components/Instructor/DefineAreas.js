import React, { useState } from 'react';
import axios from 'axios';

const DefineAreas = () => {
  const [areas, setAreas] = useState({
    area1: '',
    area2: '',
    area3: '',
    area4: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAreas((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    axios.post('http://localhost:5000/api/areas/set', areas)
      .then((response) => {
        console.log('Areas set successfully:', response.data);
      })
      .catch((error) => {
        console.error('Error setting areas:', error);
      });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Define Evaluation Areas</h2>
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
      <button type="submit">Set Areas</button>
    </form>
  );
};

export default DefineAreas;
