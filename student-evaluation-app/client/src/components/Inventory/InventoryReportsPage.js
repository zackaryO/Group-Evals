import React from 'react';
import axios from 'axios';

const InventoryReportsPage = () => {
  const styles = {
    pageContainer: {
      maxWidth: '600px',
      margin: '2rem auto',
      background: '#fafafa',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
      textAlign: 'center',
    },
    heading: {
      marginBottom: '1.5rem',
      color: '#333',
    },
    button: {
      background: '#007bff',
      color: '#fff',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      cursor: 'pointer',
      margin: '1rem',
    },
  };

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
    <div style={styles.pageContainer}>
      <h2 style={styles.heading}>Inventory Reports</h2>
      <p>Select a report below to download a PDF.</p>
      <div>
        <button style={styles.button} onClick={() => downloadPDF('/api/reports/tools')}>
          Tools Report
        </button>
        <button style={styles.button} onClick={() => downloadPDF('/api/reports/consumables')}>
          Consumables Report
        </button>
        <button style={styles.button} onClick={() => downloadPDF('/api/reports/vehicles')}>
          Training Vehicles Report
        </button>
      </div>
    </div>
  );
};

export default InventoryReportsPage;
