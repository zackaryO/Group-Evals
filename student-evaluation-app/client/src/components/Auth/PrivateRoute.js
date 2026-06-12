// student-evaluation-app\client\src\components\Auth\PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { ROLES } from '../../utils/roles';
import { isTokenValid } from '../../utils/auth';

// Generic "must be logged in" guard. The two restricted roles
// (electrical_student, electrical_instructor) are blocked from generic pages
// unless the route explicitly opts them in, since they only get access to a
// small slice of the site. Blocked users are sent to their own home base
// rather than the login screen (they're authenticated, just not permitted).
const PrivateRoute = ({
  user,
  children,
  role,
  allowElectricalStudent = false,
  allowElectricalInstructor = false,
  allowSupportStaff = false,
}) => {
  const token = localStorage.getItem('token');

  // Missing token, missing user, OR an expired/invalid token all mean "not
  // authenticated" → send to login. The app-level watchdog clears the stale
  // localStorage; here we just refuse to render the protected page.
  if (!token || !isTokenValid(token) || !user || !user._id) {
    return <Navigate to="/login" />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }

  if (user.role === ROLES.ELECTRICAL_STUDENT && !allowElectricalStudent) {
    return <Navigate to="/take-quiz" />;
  }

  if (user.role === ROLES.ELECTRICAL_INSTRUCTOR && !allowElectricalInstructor) {
    return <Navigate to="/home" />;
  }

  if (user.role === ROLES.SUPPORT_STAFF && !allowSupportStaff) {
    return <Navigate to="/home" />;
  }

  return React.cloneElement(children, { user });
};

export default PrivateRoute;
