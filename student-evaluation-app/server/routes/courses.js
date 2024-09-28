// student-evaluation-app/server/routes/courses.js

const express = require('express');
const router = express.Router();
const {
  createCourse,
  getCourses,
  deleteCourse,
  attachQuiz,
  updateWeightingFactors, // Import the new method
} = require('../controllers/courseController');

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, authorizeRoles('instructor'), createCourse);
router.get('/', authenticateToken, getCourses);
router.get('/:id', authenticateToken, getCourses); // Get course by ID
router.delete('/:id', authenticateToken, authorizeRoles('instructor'), deleteCourse);
router.put('/:id/attach-quiz', authenticateToken, authorizeRoles('instructor'), attachQuiz);

// Route to update weighting factors for a course
router.put(
  '/:id/weighting-factors',
  authenticateToken,
  authorizeRoles('instructor'),
  updateWeightingFactors
);

module.exports = router;
