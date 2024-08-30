// student-evaluation-app/server/routes/grades.js
const express = require('express');
const router = express.Router();
const QuizSubmission = require('../models/QuizSubmission');

// Route to get grades for a specific student
router.get('/:studentId', async (req, res) => {
  try {
    const grades = await QuizSubmission.find({ student: req.params.studentId })
      .populate({
        path: 'quiz',
        select: 'title',
        populate: {
          path: 'questions',
          select: 'questionText correctAnswer',
        },
      })
      .populate({
        path: 'answers.question',
        select: 'questionText correctAnswer',
      })
      .populate('student', 'username firstName lastName'); // Include firstName and lastName

    if (!grades || grades.length === 0) {
      return res.status(404).json({ message: 'No grades found for this student.' });
    }
    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to get all grades (for instructors)
router.get('/', async (req, res) => {
  try {
    const grades = await QuizSubmission.find()
      .populate({
        path: 'quiz',
        select: 'title',
        populate: {
          path: 'questions',
          select: 'questionText correctAnswer',
        },
      })
      .populate({
        path: 'answers.question',
        select: 'questionText correctAnswer',
      })
      .populate('student', 'username firstName lastName'); // Include firstName and lastName

    res.json(grades);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to delete a grade
router.delete('/:submissionId', async (req, res) => {
  try {
    const submission = await QuizSubmission.findByIdAndDelete(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found.' });
    }
    res.json({ message: 'Submission deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
