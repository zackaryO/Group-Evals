import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSignInAlt, faSignOutAlt, faBook, faUserPlus, faList, faUserGraduate, faTasks } from '@fortawesome/free-solid-svg-icons';
import './Navbar.css';  // Import the CSS file

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

const Navbar = ({ user }) => (
  <nav className="navbar">
    <ul className="navbar-list">
      <li className="navbar-item">
        <Link to="/" className="navbar-link">
          <FontAwesomeIcon icon={faHome} /> Home
        </Link>
      </li>
      <li className="navbar-item">
        <Link to="/login" className="navbar-link">
          <FontAwesomeIcon icon={faSignInAlt} /> Login
        </Link>
      </li>
      {user && user.role === 'instructor' && (
        <li className="navbar-item">
          <Link to="/register" className="navbar-link">
            <FontAwesomeIcon icon={faUserGraduate} /> Manage Users
          </Link>
        </li>
      )}
      <li className="navbar-item">
        <Link to="/evaluation" className="navbar-link">
          <FontAwesomeIcon icon={faTasks} /> Evaluation
        </Link>
      </li>
      <li className="navbar-item">
        <Link to="/gradebook" className="navbar-link">
          <FontAwesomeIcon icon={faBook} /> Gradebook
        </Link>
      </li>
      <li className="navbar-item">
        <Link to="/define-areas" className="navbar-link">
          <FontAwesomeIcon icon={faList} /> Define Areas
        </Link>
      </li>
      <li className="navbar-item">
        <Link to="/" onClick={handleLogout} className="navbar-link">
          <FontAwesomeIcon icon={faSignOutAlt} /> Logout
        </Link>
      </li>
    </ul>
    {user && (
      <div className="navbar-user-info">
        <span>{user.username} ({user.role})</span>
      </div>
    )}
  </nav>
);

export default Navbar;
