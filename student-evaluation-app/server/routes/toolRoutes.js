/**
 * @file toolRoutes.js
 * @description Express routes for creating, retrieving, updating, and deleting Tool records.
 *              Supports single-image upload via AWS S3 using "multer-s3".
 */

const express = require('express');
const router = express.Router();
const toolController = require('../controllers/toolController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
// IMPORTANT: must import from "../middleware/uploadMiddleware", not "../controllers/uploadMiddleware"
const { uploadSingle } = require('../middleware/uploadMiddleware');

/**
 * GET /api/tools
 * Retrieve all tools (instructor only).
 * @returns {Array} List of Tool objects.
 */
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.getAllTools
);

/**
 * GET /api/tools/:id
 * Retrieve a single tool by its ID (instructor only).
 * @returns {Object} The requested Tool.
 */
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.getToolById
);

/**
 * POST /api/tools
 * Create a new Tool (instructor only).
 * Single image upload field named 'image'.
 * @returns {Object} The newly-created Tool object.
 */
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadSingle('image'), // matches the formData.append('image', file)
  toolController.createTool
);

/**
 * PUT /api/tools/:id
 * Update an existing tool (instructor only).
 * Can optionally update the image by uploading a new 'image' file.
 * @returns {Object} The updated Tool object.
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
 * @returns {Object} A success message.
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  toolController.deleteTool
);

module.exports = router;
