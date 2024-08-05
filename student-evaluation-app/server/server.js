const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const evaluationRoutes = require('./routes/evaluations');
const userRoutes = require('./routes/users');
const areaRoutes = require('./routes/areas');

const app = express();

// CORS configuration
const allowedOrigins = [
  'https://group-evals.vercel.app',
  'https://group-evals-dbg0fumxc-zacks-projects-18c38742.vercel.app',
  'http://localhost:3000'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/areas', areaRoutes);

const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('MongoDB connected'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
