// student-evaluation-app/client/src/components/Navbar.jsx
//
// Top navigation. Items are grouped under dropdown menus so the bar isn't
// crowded. Dropdowns close on outside click, Escape, or item selection.

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faSignInAlt,
  faSignOutAlt,
  faBook,
  faUserGraduate,
  faChalkboardTeacher,
  faQuestionCircle,
  faFolderOpen,
  faBriefcase,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import './Navbar.css';

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('firstName');
  localStorage.removeItem('lastName');
  window.location.href = '/login';
};

const NavDropdown = ({ id, label, icon, items, openId, setOpenId }) => {
  const wrapRef = useRef(null);
  const isOpen = openId === id;
  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenId(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenId(null); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, setOpenId]);

  if (!items || items.length === 0) return null;

  return (
    <li className="navbar-item navbar-dropdown" ref={wrapRef}>
      <button
        type="button"
        className={`navbar-link navbar-dropdown-toggle ${isOpen ? 'is-open' : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setOpenId(isOpen ? null : id)}
      >
        <FontAwesomeIcon icon={icon} /> {label}
        <FontAwesomeIcon icon={faChevronDown} className="navbar-chevron" />
      </button>
      {isOpen && (
        <ul className="navbar-dropdown-menu" role="menu">
          {items.map((item) => (
            <li key={item.to} role="none">
              <Link
                to={item.to}
                className="navbar-dropdown-link"
                role="menuitem"
                onClick={() => setOpenId(null)}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

const Navbar = ({ user }) => {
  const [openId, setOpenId] = useState(null);

  const role = user?.role;
  const isInstructor = role === 'instructor' || role === 'admin';
  const isStudent = role === 'student';

  // Build dropdown contents per role. Empty arrays are filtered out by
  // NavDropdown so groups disappear when they have nothing to show.
  const quizItems = [
    isStudent && { to: '/take-quiz', label: 'Take Quiz' },
    isInstructor && { to: '/create-quiz', label: 'Create Quiz' },
    isInstructor && { to: '/manage-quizzes', label: 'Manage Quizzes' },
    user && { to: '/quiz-gradebook', label: 'Quiz Gradebook' },
  ].filter(Boolean);

  const jobSearchItems = user
    ? [
        { to: '/job-search', label: 'My Job Search' },
        { to: '/job-search/board', label: 'Class Board' },
      ]
    : [];

  const evalItems = user
    ? [
        { to: '/evaluation', label: 'Evaluation Form' },
        { to: '/eval-gradebook', label: 'Eval Gradebook' },
        isInstructor && { to: '/master-gradebook', label: 'Master Gradebook' },
        isInstructor && { to: '/define-areas', label: 'Define Eval Areas' },
      ].filter(Boolean)
    : [];

  const adminItems = isInstructor
    ? [
        { to: '/manage-users', label: 'Manage Users' },
        { to: '/manage-students', label: 'Manage Students' },
        { to: '/manage-cohorts', label: 'Manage Cohorts' },
        { to: '/manage-courses', label: 'Manage Courses' },
        { to: '/resume-builder', label: 'Resume Builder' },
      ]
    : [];

  const inventoryItems = isInstructor
    ? [
        { to: '/tools', label: 'Tools' },
        { to: '/loaner-toolboxes', label: 'Loaner Toolboxes' },
        { to: '/spare-parts', label: 'Spare Parts' },
        { to: '/instructor-tools', label: 'Instructor Tools' },
        { to: '/consumables', label: 'Consumables' },
        { to: '/facility-needs', label: 'Facility Needs' },
        { to: '/training-vehicles', label: 'Training Vehicles' },
        { to: '/inventory-reports', label: 'Inventory Reports' },
      ]
    : [];

  return (
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

        {user && (
          <>
            <NavDropdown
              id="quizzes"
              label="Quizzes"
              icon={faQuestionCircle}
              items={quizItems}
              openId={openId}
              setOpenId={setOpenId}
            />
            <NavDropdown
              id="jobsearch"
              label="Job Search"
              icon={faBriefcase}
              items={jobSearchItems}
              openId={openId}
              setOpenId={setOpenId}
            />
            <NavDropdown
              id="evaluations"
              label="Evaluations"
              icon={faFolderOpen}
              items={evalItems}
              openId={openId}
              setOpenId={setOpenId}
            />
            <NavDropdown
              id="admin"
              label="Admin"
              icon={faUserGraduate}
              items={adminItems}
              openId={openId}
              setOpenId={setOpenId}
            />
            <NavDropdown
              id="inventory"
              label="Inventory"
              icon={faChalkboardTeacher}
              items={inventoryItems}
              openId={openId}
              setOpenId={setOpenId}
            />
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
          <FontAwesomeIcon icon={faBook} style={{ marginRight: 8, opacity: 0.6 }} />
          <span>{user.username} ({user.role})</span>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
