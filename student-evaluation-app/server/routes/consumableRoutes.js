/**
 * consumableRoutes.js
 * Routes for Consumable resource.
 */

const express = require('express');
const router = express.Router();
const consumableController = require('../controllers/consumableController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../controllers/uploadMiddleware');

// GET all consumables
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  consumableController.getAllConsumables
);

// GET a single consumable
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  consumableController.getConsumableById
);

// CREATE a consumable
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),
  consumableController.createConsumable
);

// UPDATE a consumable
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),
  consumableController.updateConsumable
);

// DELETE a consumable
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  consumableController.deleteConsumable
);

module.exports = router;
