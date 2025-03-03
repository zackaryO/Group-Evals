/**
 * @file toolRoutes.js
 * @description Express routes for managing Tool resources (CRUD).
 *              Uses new memory-based multer + AWS SDK v3 in the controller.
 */

const express = require('express');
const router = express.Router();
const toolController = require('../controllers/toolController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');

/**
 * GET /api/tools (instructor only)
 * Fetch all tools.
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.getAllTools
);

/**
 * GET /api/tools/:id (instructor only)
 * Fetch a single tool by ID.
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.getToolById
);

/**
 * POST /api/tools (instructor only)
 * Create a new tool with optional image upload in req.file.
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),  // <--- memory-based
  toolController.createTool
);

/**
 * PUT /api/tools/:id (instructor only)
 * Update an existing tool by ID, with optional new image.
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),  // <--- memory-based
  toolController.updateTool
);

/**
 * DELETE /api/tools/:id (instructor only)
 * Delete a tool by ID.
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.deleteTool
);

module.exports = router;
