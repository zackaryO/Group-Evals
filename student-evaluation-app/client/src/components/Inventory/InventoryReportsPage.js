/**
 * InventoryReportsPage.js
 * Provides buttons to download various PDF reports from the server.
 * Only instructors can access this page (enforced by route in App.js).
 */

import React from 'react';
import axios from 'axios';

const InventoryReportsPage = () => {
  // Retrieve the token from localStorage or context
  const token = localStorage.getItem('token');

  /**
   * downloadPDF
   * Makes a GET request to the specified endpoint with 'blob' responseType,
   * then triggers a download of the returned PDF.
   * @param {string} endpoint - The API endpoint (e.g. '/api/reports/tools')
   */
  const downloadPDF = async (endpoint) => {
    try {
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob', // important for file download
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'report.pdf'); // default name
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download report');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Inventory Reports</h2>
      <p>Click the buttons below to download PDF reports for different inventory categories.</p>
      <div style={{ margin: '1rem 0' }}>
        <button onClick={() => downloadPDF('/api/reports/tools')}>
          Tools Report
        </button>
      </div>
      <div style={{ margin: '1rem 0' }}>
        <button onClick={() => downloadPDF('/api/reports/consumables')}>
          Consumables Report
        </button>
      </div>
      <div style={{ margin: '1rem 0' }}>
        <button onClick={() => downloadPDF('/api/reports/vehicles')}>
          Training Vehicles Report
        </button>
      </div>
      {/* Add more if you have more endpoints, e.g. Spare Parts, etc. */}
    </div>
  );
};

export default InventoryReportsPage;
