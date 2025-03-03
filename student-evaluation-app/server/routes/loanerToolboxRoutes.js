/**
 * loanerToolboxRoutes.js
 * Routes for LoanerToolbox resource.
 */

const express = require('express');
const router = express.Router();
const loanerToolboxController = require('../controllers/loanerToolboxController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadArray } = require('../middleware/uploadMiddleware');

// GET all loaner toolboxes
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.getAllLoanerToolboxes
);

// GET a single toolbox by ID
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.getLoanerToolboxById
);

// CREATE a new toolbox (upload multiple drawer images if needed)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadArray('images', 5),
  loanerToolboxController.createLoanerToolbox
);

// UPDATE a toolbox
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadArray('images', 5),
  loanerToolboxController.updateLoanerToolbox
);

// DELETE a toolbox
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.deleteLoanerToolbox
);

module.exports = router;
