// student-evaluation-app/client/src/components/Navbar.js

import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faSignInAlt,
  faSignOutAlt,
  faBook,
  faUserGraduate,
  faTasks,
  faChalkboardTeacher,
  faQuestionCircle,
  faClipboardList,
  faFolderOpen,
  faUsers,
  faTools,  // added for Tools icon
} from '@fortawesome/free-solid-svg-icons';
import './Navbar.css';

const handleLogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

const Navbar = ({ user }) => (
  <nav className="navbar">
    <ul className="navbar-list">
      <li className="navbar-item">
        <Link to="/home" className="navbar-link">
          <FontAwesomeIcon icon={faHome} /> Home
        </Link>
      </li>
      {!user && (
        <li className="navbar-item">
          <Link to="/login" className="navbar-link">
            <FontAwesomeIcon icon={faSignInAlt} /> Login
          </Link>
        </li>
      )}
      {user && user.role === 'student' && (
        <>
          <li className="navbar-item">
            <Link to="/take-quiz" className="navbar-link">
              <FontAwesomeIcon icon={faQuestionCircle} /> Take Quiz
            </Link>
          </li>
        </>
      )}
      {user && user.role === 'instructor' && (
        <>
          <li className="navbar-item">
            <Link to="/manage-users" className="navbar-link">
              <FontAwesomeIcon icon={faUserGraduate} /> Manage Users
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/create-quiz" className="navbar-link">
              <FontAwesomeIcon icon={faChalkboardTeacher} /> Create Quiz
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/manage-quizzes" className="navbar-link">
              <FontAwesomeIcon icon={faTasks} /> Manage Quizzes
            </Link>
          </li>

          {/* New Inventory Menu for Instructors */}
          <li className="navbar-item">
            <Link to="/tools" className="navbar-link">
              <FontAwesomeIcon icon={faTools} /> Tools
            </Link>
          </li>
          {/* Add more if desired, e.g. Spare Parts, etc. */}
        </>
      )}
      {user && (
        <>
          <li className="navbar-item">
            <Link to="/evaluation" className="navbar-link">
              <FontAwesomeIcon icon={faFolderOpen} /> Evaluation
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/quiz-gradebook" className="navbar-link">
              <FontAwesomeIcon icon={faBook} /> Quiz Gradebook
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/eval-gradebook" className="navbar-link">
              <FontAwesomeIcon icon={faBook} /> Eval Gradebook
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/" onClick={handleLogout} className="navbar-link">
              <FontAwesomeIcon icon={faSignOutAlt} /> Logout
            </Link>
          </li>
        </>
      )}
    </ul>
    {user && (
      <div className="navbar-user-info">
        <span>
          { user.username } ({user.role})
        </span>
      </div>
    )}
  </nav>
);

export default Navbar;
