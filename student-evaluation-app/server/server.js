/**
 * @file server.js
 * @description Main entry point for the Student Evaluation + Inventory Management server.
 *              Configures Express, connects to MongoDB, and registers all routes/middlewares.
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config(); // If your .env is in this same folder, no path needed
// Or if your .env is in a parent folder, use: dotenv.config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import route handlers (existing)
const authRoutes = require('./routes/auth');
const evaluationRoutes = require('./routes/evaluations');
const userRoutes = require('./routes/users');
const areaRoutes = require('./routes/areas');
const quizRoutes = require('./routes/quizzes');
const gradeRoutes = require('./routes/grades');
const cohortRoutes = require('./routes/cohorts');
const courseRoutes = require('./routes/courses');
const assignmentRoutes = require('./routes/assignments');

// NEW: Inventory route imports
const toolRoutes = require('./routes/toolRoutes');
const loanerToolboxRoutes = require('./routes/loanerToolboxRoutes');
const sparePartRoutes = require('./routes/sparePartRoutes');
const instructorToolRoutes = require('./routes/instructorToolRoutes');
const consumableRoutes = require('./routes/consumableRoutes');
const facilityNeedRoutes = require('./routes/facilityNeedRoutes');
const trainingVehicleRoutes = require('./routes/trainingVehicleRoutes');
const reportRoutes = require('./routes/reportRoutes'); // If you have a separate route for PDF reports

// Verify environment variables
// console.log('> MONGODB_URI:', process.env.MONGODB_URI || 'MISSING');
// console.log('> JWT_SECRET:', process.env.JWT_SECRET ? 'AVAILABLE' : 'MISSING');
// Optionally log AWS keys or other env vars if debugging

const app = express();

/**
 * Debugging middleware to log all incoming requests.
 */
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// CORS configuration
const allowedOrigins = [
  'https://group-evals.vercel.app',
  'https://group-evals-dbg0fumxc-zacks-projects-18c38742.vercel.app',
  'http://localhost:3000',
  // Add other allowed client origins here
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// For parsing JSON bodies
app.use(express.json());

// Serve images from local "uploads" folder if needed
app.use('/uploads', express.static('uploads'));

// Register existing routes
app.use('/api/auth', authRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);

// NEW: Register inventory-related routes
app.use('api/tools', toolRoutes);
app.use('/api/loaner-toolboxes', loanerToolboxRoutes);
app.use('/api/spare-parts', sparePartRoutes);
app.use('/api/instructor-tools', instructorToolRoutes);
app.use('/api/consumables', consumableRoutes);
app.use('/api/facility-needs', facilityNeedRoutes);
app.use('/api/training-vehicles', trainingVehicleRoutes);

// If you have a separate route for PDF reports:
app.use('/api/reports', reportRoutes);

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  console.error('No MONGODB_URI found in environment. Exiting.');
  process.exit(1);
}

mongoose
  .connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
