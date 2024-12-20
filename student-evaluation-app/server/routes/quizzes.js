// student-evaluation-app/server/routes/quizzes.js
const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizQuestion = require('../models/QuizQuestion');
const QuizSubmission = require('../models/QuizSubmission');

// Create a new quiz
router.post('/create', async (req, res) => {
  const {
    title,
    instructorId,
    allowMultipleSubmissions,
    cohortId,
    courseId,
    dueDate,
    allowLateSubmissions,
    latePenalty,
  } = req.body;
  try {
    const newQuiz = new Quiz({
      title,
      instructor: instructorId,
      allowMultipleSubmissions,
      cohort: cohortId,
      course: courseId,
      dueDate,
      allowLateSubmissions,
      latePenalty,
    });
    await newQuiz.save();
    res.status(201).json(newQuiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all quizzes
router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate('questions');
    res.json(quizzes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get published quizzes
router.get('/published', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublished: true }).populate('questions');
    res.json(quizzes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Publish or unpublish a quiz
router.put('/:quizId/publish', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    quiz.isPublished = !quiz.isPublished;
    await quiz.save();

    res.json(quiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add a question to a quiz
router.post('/:quizId/add-question', async (req, res) => {
  const { questionText, options, correctAnswer, image, questionType } = req.body;
  try {
    const newQuestion = new QuizQuestion({
      questionText,
      options,
      correctAnswer,
      image,
      questionType,
      quiz: req.params.quizId,
    });
    await newQuestion.save();

    const quiz = await Quiz.findById(req.params.quizId);
    quiz.questions.push(newQuestion._id);
    await quiz.save();

    res.status(201).json(newQuestion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a specific question in a quiz
router.put('/:quizId/question/:questionId', async (req, res) => {
  try {
    const { questionText, options, correctAnswer, image, questionType } = req.body;
    const question = await QuizQuestion.findByIdAndUpdate(
      req.params.questionId,
      { questionText, options, correctAnswer, image, questionType },
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a specific question in a quiz
router.delete('/:quizId/question/:questionId', async (req, res) => {
  try {
    const question = await QuizQuestion.findByIdAndDelete(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    // Also remove the question reference from the quiz
    await Quiz.findByIdAndUpdate(req.params.quizId, {
      $pull: { questions: req.params.questionId },
    });
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a quiz by ID
router.delete('/:quizId', async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    // Delete related quiz submissions and questions
    await QuizQuestion.deleteMany({ quiz: req.params.quizId });
    await QuizSubmission.deleteMany({ quiz: req.params.quizId });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific quiz by ID
router.get('/:quizId', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId).populate('questions');
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Submit quiz answers and calculate the score
router.post('/:quizId/submit', async (req, res) => {
  const { answers, studentId } = req.body;
  try {
    const quiz = await Quiz.findById(req.params.quizId).populate('questions');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Check if the quiz is locked
    const currentDate = new Date();
    const dueDate = new Date(quiz.dueDate);
    if (currentDate > dueDate && !quiz.allowLateSubmissions) {
      return res.status(400).json({ message: 'This quiz is closed for submissions.' });
    }

    if (!quiz.allowMultipleSubmissions) {
      const existingSubmission = await QuizSubmission.findOne({ student: studentId, quiz: quiz._id });
      if (existingSubmission) {
        return res.status(400).json({ message: 'You have already submitted this quiz.' });
      }
    }

    let correctAnswers = 0;
    const answerArray = [];

    quiz.questions.forEach((question) => {
      const selectedAnswer = answers[question._id];
      let isCorrect = false;
      if (question.questionType === 'multiple-choice') {
        isCorrect = selectedAnswer === question.correctAnswer;
        if (isCorrect) correctAnswers++;
      }
      answerArray.push({
        question: question._id,
        selectedAnswer,
        isCorrect,
      });
    });

    const score = (correctAnswers / quiz.questions.length) * 100;

    const quizSubmission = new QuizSubmission({
      student: studentId,
      quiz: quiz._id,
      score: score,
      answers: answerArray,
    });

    await quizSubmission.save();

    res.json({ score });
  } catch (error) {
    console.error('Error submitting quiz:', error.message);
    res.status(500).json({ message: 'Error submitting quiz' });
  }
});

// Toggle multiple submissions
router.put('/:quizId/toggle-multiple-submissions', async (req, res) => {
  try {
    const { quizId } = req.params;
    const { allowMultipleSubmissions } = req.body;

    const quiz = await Quiz.findByIdAndUpdate(
      quizId,
      { allowMultipleSubmissions },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found.' });
    }

    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
