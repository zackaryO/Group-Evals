const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const evaluationRoutes = require('./routes/evaluations');
const areaRoutes = require('./routes/areas');
const userRoutes = require('./routes/users');

const app = express();

// Update MongoDB connection string without deprecated options
mongoose.connect('mongodb+srv://zackotterstrom:K0F26MMFtJ7NZAbA@studenteval.btvyzzz.mongodb.net/')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));