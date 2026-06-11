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
  faBars,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import './Navbar.css';
import {
  isFullInstructor,
  isElectricalInstructor,
  isInstructorTier,
  isElectricalStudent,
  isRegularStudent,
  isSupportStaff,
} from '../utils/roles';

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('firstName');
  localStorage.removeItem('lastName');
  window.location.href = '/login';
};

const NavDropdown = ({ id, label, icon, items, openId, setOpenId, onNavigate }) => {
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
                onClick={() => { setOpenId(null); if (onNavigate) onNavigate(); }}
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => { setMobileOpen(false); setOpenId(null); };

  const role = user?.role;
  const fullInstructor = isFullInstructor(role);
  const electricalInstructor = isElectricalInstructor(role);
  const instructorTier = isInstructorTier(role);
  const electricalStudent = isElectricalStudent(role);
  const regularStudent = isRegularStudent(role);
  const supportStaff = isSupportStaff(role);
  // Job search / evaluations are available to regular students, full instructors
  // and support staff. Electrical instructors and electrical students are scoped
  // to quizzes (+ the electrical roster for the instructor).
  const showGeneralStudentTools = fullInstructor || regularStudent || supportStaff;

  // Build dropdown contents per role. Empty arrays are filtered out by
  // NavDropdown so groups disappear when they have nothing to show.
  const quizItems = [
    (regularStudent || electricalStudent) && { to: '/take-quiz', label: 'Take Quiz' },
    instructorTier && { to: '/create-quiz', label: 'Create Quiz' },
    instructorTier && { to: '/manage-quizzes', label: 'Manage Quizzes' },
    user && { to: '/quiz-gradebook', label: 'Quiz Gradebook' },
  ].filter(Boolean);

  const jobSearchItems = showGeneralStudentTools
    ? [
        { to: '/job-search', label: 'My Job Search' },
        { to: '/job-search/board', label: 'Class Board' },
        { to: '/resume-builder', label: 'Resume Builder' },
      ]
    : [];

  const evalItems = showGeneralStudentTools
    ? [
        { to: '/evaluation', label: 'Evaluation Form' },
        { to: '/eval-gradebook', label: 'Eval Gradebook' },
        fullInstructor && { to: '/master-gradebook', label: 'Master Gradebook' },
        fullInstructor && { to: '/define-areas', label: 'Define Eval Areas' },
      ].filter(Boolean)
    : [];

  // Full instructors get the complete admin menu; electrical instructors get
  // only their electrical-student roster manager.
  const adminItems = fullInstructor
    ? [
        { to: '/manage-users', label: 'Manage Users' },
        { to: '/manage-students', label: 'Manage Students' },
        { to: '/manage-electrical-students', label: 'A6 Prep Students' },
        { to: '/manage-cohorts', label: 'Manage Cohorts' },
        { to: '/manage-courses', label: 'Manage Courses' },
      ]
    : electricalInstructor
    ? [{ to: '/manage-electrical-students', label: 'A6 Prep Students' }]
    : [];

  const inventoryItems = fullInstructor
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
      <button
        type="button"
        className="navbar-toggle"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((o) => !o)}
      >
        <FontAwesomeIcon icon={mobileOpen ? faTimes : faBars} />
      </button>

      <ul className={`navbar-list ${mobileOpen ? 'is-open' : ''}`}>
        <li className="navbar-item">
          <Link to="/home" className="navbar-link" onClick={closeMobile}>
            <FontAwesomeIcon icon={faHome} /> Home
          </Link>
        </li>

        {!user && (
          <li className="navbar-item">
            <Link to="/login" className="navbar-link" onClick={closeMobile}>
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
              onNavigate={closeMobile}
            />
            <NavDropdown
              id="jobsearch"
              label="Job Search"
              icon={faBriefcase}
              items={jobSearchItems}
              openId={openId}
              setOpenId={setOpenId}
              onNavigate={closeMobile}
            />
            <NavDropdown
              id="evaluations"
              label="Evaluations"
              icon={faFolderOpen}
              items={evalItems}
              openId={openId}
              setOpenId={setOpenId}
              onNavigate={closeMobile}
            />
            <NavDropdown
              id="admin"
              label="Admin"
              icon={faUserGraduate}
              items={adminItems}
              openId={openId}
              setOpenId={setOpenId}
              onNavigate={closeMobile}
            />
            <NavDropdown
              id="inventory"
              label="Inventory"
              icon={faChalkboardTeacher}
              items={inventoryItems}
              openId={openId}
              setOpenId={setOpenId}
              onNavigate={closeMobile}
            />
            <li className="navbar-item">
              <Link to="/" onClick={() => { closeMobile(); handleLogout(); }} className="navbar-link">
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
