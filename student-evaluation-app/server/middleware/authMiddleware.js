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

  console.log('JWT_SECRET:', process.env.JWT_SECRET); // Log the secret to make sure it's loaded
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log('JWT verification failed:', err.message); // Log to see why verification failed
      return res.sendStatus(403); // Forbidden
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

module.exports = { authenticateToken, authorizeRoles };
