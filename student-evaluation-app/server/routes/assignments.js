// student-evaluation-app/server/routes/assignments.js
const express = require('express');
const router = express.Router();
const {
  createAssignment,
  getAssignmentById,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
} = require('../controllers/assignmentController');

router.post('/', createAssignment);
router.get('/:assignmentId', getAssignmentById);
router.post('/:assignmentId/submit', submitAssignment);
router.get('/:assignmentId/submissions', getSubmissions);
router.put('/:assignmentId/grade/:submissionId', gradeSubmission);

module.exports = router;
