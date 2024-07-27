import React from 'react';
import { Navigate } from 'react-router-dom';

const InstructorRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  return token && role === 'instructor' ? children : <Navigate to="/login" />;
};

export default InstructorRoute;
