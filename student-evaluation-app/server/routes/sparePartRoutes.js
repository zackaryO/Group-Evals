/**
 * sparePartRoutes.js
 * Routes for SparePart resource.
 */

const express = require('express');
const router = express.Router();
const sparePartController = require('../controllers/sparePartController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../controllers/uploadMiddleware');

// GET all spare parts
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  sparePartController.getAllSpareParts
);

// GET a single spare part
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  sparePartController.getSparePartById
);

// CREATE a spare part
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),
  sparePartController.createSparePart
);

// UPDATE a spare part
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),
  sparePartController.updateSparePart
);

// DELETE a spare part
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  sparePartController.deleteSparePart
);

module.exports = router;
