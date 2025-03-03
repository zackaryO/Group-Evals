/**
 * @file consumableRoutes.js
 * @description Routes for Consumable resource, phone-friendly front-end, AWS v3 backend.
 */

const express = require('express');
const router = express.Router();
const consumableController = require('../controllers/consumableController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

// GET all consumables
router.get('/', authenticateToken, authorizeRoles('instructor'), consumableController.getAllConsumables);

// GET one consumable
router.get('/:id', authenticateToken, authorizeRoles('instructor'), consumableController.getConsumableById);

// CREATE
router.post('/', authenticateToken, authorizeRoles('instructor'), uploadSingle('image'), consumableController.createConsumable);

// UPDATE
router.put('/:id', authenticateToken, authorizeRoles('instructor'), uploadSingle('image'), consumableController.updateConsumable);

// DELETE
router.delete('/:id', authenticateToken, authorizeRoles('instructor'), consumableController.deleteConsumable);

module.exports = router;
