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

// CREATE new toolbox
router.post(
  '/',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadArray('drawerImages', 10),
  loanerToolboxController.createLoanerToolbox
);

// UPDATE toolbox
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  uploadArray('drawerImages', 10),
  loanerToolboxController.updateLoanerToolbox
);

// DELETE entire toolbox
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.deleteLoanerToolbox
);

// DELETE a single drawer image from a toolbox
router.delete(
  '/:id/drawer-images',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.deleteDrawerImage
);

// ATTACH tool
router.post(
  '/:id/attach-tool',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.attachTool
);

// DETACH tool
router.post(
  '/:id/detach-tool',
  authenticateToken,
  authorizeRoles('instructor'),
  loanerToolboxController.detachTool
);

module.exports = router;
