import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ user, children, role }) => {
  const token = localStorage.getItem('token');

  if (!token || !user || !user._id) {
    return <Navigate to="/login" />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }

  return React.cloneElement(children, { user });
};

export default PrivateRoute;
