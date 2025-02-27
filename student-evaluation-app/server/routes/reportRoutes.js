/**
 * reportRoutes.js
 * Express routes for PDF report generation.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const reportController = require('../controllers/reportController');

/**
 * GET /api/reports/tools
 * Generate PDF for tools.
 */
router.get(
  '/tools',
  authenticateToken,
  authorizeRoles('instructor'),
  reportController.generateToolsReport
);

/**
 * GET /api/reports/consumables
 * Generate PDF for low-stock consumables.
 */
router.get(
  '/consumables',
  authenticateToken,
  authorizeRoles('instructor'),
  reportController.generateConsumablesReport
);

/**
 * GET /api/reports/vehicles
 * Generate PDF for training vehicles.
 */
router.get(
  '/vehicles',
  authenticateToken,
  authorizeRoles('instructor'),
  reportController.generateVehiclesReport
);

module.exports = router;
