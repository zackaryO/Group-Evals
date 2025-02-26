// student-evaluation-app/server/server.js

/**
 * Main server entry point for Student Evaluation App.
 * Sets up Express, connects to MongoDB, and configures routes & middlewares.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Import route handlers
const authRoutes = require('./routes/auth');
const evaluationRoutes = require('./routes/evaluations');
const userRoutes = require('./routes/users');
const areaRoutes = require('./routes/areas');
const quizRoutes = require('./routes/quizzes');
const gradeRoutes = require('./routes/grades');
const cohortRoutes = require('./routes/cohorts');
const courseRoutes = require('./routes/courses');
const assignmentRoutes = require('./routes/assignments');

dotenv.config();

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
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Add OPTIONS to allowed methods
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests
app.use(express.json());

// Serve images from the local "uploads" folder
app.use('/uploads', express.static('uploads'));

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assignments', assignmentRoutes);

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;

mongoose
  .connect(mongoURI)
  .then(() => console.log('MongoDB connected'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit process if unable to connect
  });

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
