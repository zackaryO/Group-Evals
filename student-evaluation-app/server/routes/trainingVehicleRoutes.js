/**
 * trainingVehicleRoutes.js
 * Routes for TrainingVehicle resource.
 */

const express = require('express');
const router = express.Router();
const trainingVehicleController = require('../controllers/trainingVehicleController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// GET all training vehicles
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  trainingVehicleController.getAllTrainingVehicles
);

// GET a single training vehicle
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  trainingVehicleController.getTrainingVehicleById
);

// CREATE a training vehicle
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  trainingVehicleController.createTrainingVehicle
);

// UPDATE a training vehicle
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  trainingVehicleController.updateTrainingVehicle
);

// DELETE a training vehicle
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  trainingVehicleController.deleteTrainingVehicle
);

module.exports = router;
