/**
 * facilityNeedRoutes.js
 * Routes for FacilityNeed resource.
 */

const express = require('express');
const router = express.Router();
const facilityNeedController = require('../controllers/facilityNeedController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadArray } = require('../middleware/uploadMiddleware');

// GET all facility needs
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  facilityNeedController.getAllFacilityNeeds
);

// GET a single facility need
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  facilityNeedController.getFacilityNeedById
);

// CREATE a facility need (upload multiple images if needed)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadArray('images', 5),
  facilityNeedController.createFacilityNeed
);

// UPDATE a facility need
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadArray('images', 5),
  facilityNeedController.updateFacilityNeed
);

// DELETE a facility need
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  facilityNeedController.deleteFacilityNeed
);

module.exports = router;
