const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const evaluationRoutes = require('./routes/evaluations');
const userRoutes = require('./routes/users');
const areaRoutes = require('./routes/areas');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/evaluations', evaluationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/areas', areaRoutes);

const mongoURI = 'mongodb+srv://<username>:<password>@sandbox.a6a9lpv.mongodb.net/<dbname>?retryWrites=true&w=majority';

mongoose.connect(mongoURI);

const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('MongoDB connected'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
