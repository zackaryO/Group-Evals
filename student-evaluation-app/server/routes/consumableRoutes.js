/**
 * @file consumableRoutes.js
 * @description Routes for Consumable resource. Similar to Tools approach, but no Tools code.
 */

const express = require('express');
const router = express.Router();
const consumableController = require('../controllers/consumableController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

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

// CREATE a consumable (with optional single image)
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
