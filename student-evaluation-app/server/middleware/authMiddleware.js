const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log('Authorization Header:', authHeader); // Log to see the authorization header

  // Extract the token from the "Bearer <token>" format
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Token missing');
    return res.sendStatus(401); // Unauthorized
  }

  // console.log('JWT_SECRET:', process.env.JWT_SECRET); // Log the secret to make sure it's loaded
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('JWT verification failed:', err.message); // Log to see why verification failed
      // 401: token is missing/invalid/expired (auth fail). The client treats
      // 401 specifically as "log out + redirect to /login"; 403 is reserved
      // for "authenticated but not authorized for this resource".
      return res.sendStatus(401);
    }
    console.log('Decoded User:', decoded); // Log decoded information from JWT
    req.user = decoded;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log('User Role:', req.user.role); // Add a log to check the role
    if (!req.user || !roles.includes(req.user.role)) {
      console.log('User not authorized'); // Log to indicate unauthorized access
      return res.sendStatus(403); // Forbidden
    }
    next();
  };
};

// ─────────────────────────────────────────── Role tiers
// "Full" instructors (instructor/admin) can do everything in the app. The
// "electrical_instructor" is a second tier: it can manage quizzes and a roster
// of "electrical_student" users it created, but only those. The instructor tier
// is the union — any endpoint a full instructor may hit, an electrical
// instructor may hit too (with per-resource ownership checks applied inside).
const FULL_INSTRUCTOR_ROLES = ['instructor', 'admin'];
const INSTRUCTOR_TIER_ROLES = ['instructor', 'admin', 'electrical_instructor'];

const isFullInstructor = (role) => FULL_INSTRUCTOR_ROLES.includes(role);
const isInstructorTier = (role) => INSTRUCTOR_TIER_ROLES.includes(role);

module.exports = {
  authenticateToken,
  authorizeRoles,
  FULL_INSTRUCTOR_ROLES,
  INSTRUCTOR_TIER_ROLES,
  isFullInstructor,
  isInstructorTier,
};
