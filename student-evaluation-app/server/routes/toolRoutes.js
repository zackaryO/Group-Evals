/**
 * toolRoutes.js
 * Express routes for managing Tool resources.
 */
const express = require('express');
const router = express.Router();
const toolController = require('../controllers/toolController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
// Updated import path for upload middleware
const { uploadSingle } = require('../middleware/uploadMiddleware');

/**
 * GET /api/tools
 * Retrieve all tools (instructor only).
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.getAllTools
);

/**
 * GET /api/tools/:id
 * Retrieve a single tool by ID (instructor only).
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.getToolById
);

/**
 * POST /api/tools
 * Create a new tool (instructor only).
 * Upload a single image field named 'image'.
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),
  toolController.createTool
);

/**
 * PUT /api/tools/:id
 * Update an existing tool by ID (instructor only).
 * Can also update the image by uploading new 'image' file.
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'),
  toolController.updateTool
);

/**
 * DELETE /api/tools/:id
 * Delete a tool by ID (instructor only).
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.deleteTool
);

module.exports = router;
