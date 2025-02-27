/**
 * instructorToolRoutes.js
 * Routes for InstructorTool resource.
 */

const express = require('express');
const router = express.Router();
const instructorToolController = require('../controllers/instructorToolController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../controllers/uploadMiddleware');

// GET all instructor tools
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  instructorToolController.getAllInstructorTools
);

// GET a single instructor tool
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  instructorToolController.getInstructorToolById
);

// CREATE an instructor tool
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),
  instructorToolController.createInstructorTool
);

// UPDATE an instructor tool
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),
  instructorToolController.updateInstructorTool
);

// DELETE an instructor tool
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  instructorToolController.deleteInstructorTool
);

module.exports = router;
