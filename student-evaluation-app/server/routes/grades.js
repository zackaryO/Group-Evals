// student-evaluation-app/server/routes/grades.js

const express = require('express');
const router = express.Router();
const {
  getGrades,
  getOverallGrades,
  getStudentProgress,
  getAllStudentsProgress,
  deleteGrade,
} = require('../controllers/gradeController');

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Route to get all grades (accessible by instructors)
router.get('/', authenticateToken, authorizeRoles('instructor'), getGrades);

// Route to get grades for a specific student (accessible by students)
router.get('/:studentId', authenticateToken, getGrades);

// Route to get overall grades for all students (accessible by instructors)
router.get('/overall', authenticateToken, authorizeRoles('instructor'), getOverallGrades);

// Route to get progress for a specific student
router.get('/student/:studentId/progress', authenticateToken, getStudentProgress);

// Route to get progress for all students (accessible by instructors)
router.get('/progress', authenticateToken, authorizeRoles('instructor'), getAllStudentsProgress);

// Route to delete a grade
router.delete('/:id', authenticateToken, authorizeRoles('instructor'), deleteGrade);

module.exports = router;
