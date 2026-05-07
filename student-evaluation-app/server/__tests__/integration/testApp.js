// __tests__/integration/testApp.js
//
// Lightweight Express app harness for route integration tests. Uses an in-memory
// MongoDB so tests don't touch the real database. Issues real JWTs so the
// production authMiddleware works without modification.

const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// JWT secret used by both signing helper here and the real authMiddleware.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_integration';

let mongo;

async function startTestDb() {
  if (mongo) return;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}

async function stopTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongo) {
    await mongo.stop();
    mongo = null;
  }
}

async function clearDb() {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dealerships', require('../../routes/dealerships'));
  app.use('/api/job-search', require('../../routes/jobSearch'));
  return app;
}

function makeToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET);
}

async function makeUser({ role = 'student', firstName = 'Test', lastName = 'User', cohort = null } = {}) {
  const User = require('../../models/User');
  const user = await User.create({
    username: `${role}_${Math.random().toString(36).slice(2, 8)}`,
    password: 'x', // not used in tests; we sign tokens directly
    role,
    firstName,
    lastName,
    cohort,
  });
  return { user, token: makeToken(user) };
}

module.exports = { startTestDb, stopTestDb, clearDb, buildApp, makeToken, makeUser };
