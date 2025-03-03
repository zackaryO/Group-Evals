/**
 * @file InventoryReportsPage.jsx
 * @description React component to download PDF reports for various inventory categories,
 *              styled with a phone-friendly approach similar to ToolsPage.
 */

import React from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './InventoryReportsPage.css';

const InventoryReportsPage = () => {
  const token = localStorage.getItem('token');

  const downloadPDF = async (endpoint) => {
    try {
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download report');
    }
  };

  return (
    <div className="reports-page-container">
      <h2 className="reports-heading">Inventory Reports</h2>
      <p className="reports-description">
        Select a report below to download a PDF of that inventory category.
      </p>
      <div className="reports-button-wrapper">
        <button
          className="reports-button"
          onClick={() => downloadPDF(`${URL}/api/reports/consumables`)}
        >
          Low-Stock Consumables
        </button>
        <button
          className="reports-button"
          onClick={() => downloadPDF(`${URL}/api/reports/vehicles`)}
        >
          Training Vehicles
        </button>
        <button
          className="reports-button"
          onClick={() => downloadPDF(`${URL}/api/reports/spareparts`)}
        >
          Spare Parts (example)
        </button>
                <button
          className="reports-button"
          onClick={() => downloadPDF(`${URL}/api/reports/tools`)}
        >
          Tools Inventory
        </button>
        {/* Add more if needed */}
      </div>
    </div>
  );
};

export default InventoryReportsPage;
