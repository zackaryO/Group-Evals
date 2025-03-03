const express = require('express');
const router = express.Router();
const loanerToolboxController = require('../controllers/loanerToolboxController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const { uploadArray } = require('../middleware/uploadMiddleware');

// GET all
router.get(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.getAllLoanerToolboxes
);

// GET single
router.get(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.getLoanerToolboxById
);

// GET tools in / out
router.get(
  '/:id/tools',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.getToolboxTools
);

// CREATE
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadArray('drawerImages', 10),
  loanerToolboxController.createLoanerToolbox
);

// UPDATE
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadArray('drawerImages', 10),
  loanerToolboxController.updateLoanerToolbox
);

// DELETE
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.deleteLoanerToolbox
);

// ATTACH
router.post(
  '/:id/attach-tool',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.attachTool
);

// DETACH
router.post(
  '/:id/detach-tool',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.detachTool
);

module.exports = router;
