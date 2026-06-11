// student-evaluation-app\client\src\components\Auth\InstructorRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROLES } from '../../utils/roles';

// Role-gated route. Defaults to full instructors (instructor/admin). Pass a
// `roles` array to widen access — e.g. quiz pages also allow
// 'electrical_instructor'. Logged-in users without a permitted role are sent
// to their home base instead of the login screen.
const InstructorRoute = ({
  user,
  children,
  roles = [ROLES.INSTRUCTOR, ROLES.ADMIN],
}) => {
  const token = localStorage.getItem('token');
  const role = user?.role || localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (!roles.includes(role)) {
    if (role === ROLES.ELECTRICAL_STUDENT) return <Navigate to="/take-quiz" />;
    if (role === ROLES.ELECTRICAL_INSTRUCTOR) return <Navigate to="/home" />;
    return <Navigate to="/" />;
  }

  return children;
};

export default InstructorRoute;
