// InstructorRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const InstructorRoute = ({ user, children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token || role !== 'instructor') {
    return <Navigate to="/login" />;
  }
  return children;
};

export default InstructorRoute;
