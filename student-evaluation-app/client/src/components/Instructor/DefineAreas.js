import React, { useState } from 'react';
import axios from 'axios';

const DefineAreas = () => {
  const [areas, setAreas] = useState({ area1: '', area2: '', area3: '', area4: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/areas/set', areas);
      // Handle success
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Define Evaluation Areas</h2>
      <form onSubmit={handleSubmit}>
        <label>Area 1:</label>
        <input type="text" value={areas.area1} onChange={(e) => setAreas({ ...areas, area1: e.target.value })} required />
        <label>Area 2:</label>
        <input type="text" value={areas.area2} onChange={(e) => setAreas({ ...areas, area2: e.target.value })} required />
        <label>Area 3:</label>
        <input type="text" value={areas.area3} onChange={(e) => setAreas({ ...areas, area3: e.target.value })} required />
        <label>Area 4:</label>
        <input type="text" value={areas.area4} onChange={(e) => setAreas({ ...areas, area4: e.target.value })} required />
        <button type="submit">Save Areas</button>
      </form>
    </div>
  );
};

export default DefineAreas;
