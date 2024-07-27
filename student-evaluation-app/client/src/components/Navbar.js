import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => (
  <nav>
    <ul>
      <li><Link to="/">Home</Link></li>
      <li><Link to="/login">Login</Link></li>
      <li><Link to="/evaluation">Evaluation</Link></li>
      <li><Link to="/gradebook">Gradebook</Link></li>
      <li><Link to="/define-areas">Define Areas</Link></li>
      <li><Link to="/manage-students">Manage Students</Link></li>
      <li><Link to="/" onClick={handleLogout}>Logout</Link></li>
    </ul>
  </nav>
);

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

export default Navbar;
