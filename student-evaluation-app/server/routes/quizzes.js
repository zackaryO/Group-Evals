// student-evaluation-app/server/routes/quizzes.js

const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizQuestion = require('../models/QuizQuestion');
const QuizSubmission = require('../models/QuizSubmission');
const multer = require('multer');

const { uploadBufferToS3, deleteFromS3 } = require('../utils/s3');


/**
 * Configure Multer for in-memory image uploads.
 * TODO-S3: remove disk storage and upload buffers directly to S3.
 */
const storage = multer.memoryStorage();

// Only allow image files
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ───────────────────────────────────────── Grading helpers
const normalizeAnswer = (v) => String(v ?? '').trim();

// Levenshtein distance — used for forgiving comparison of past selectedAnswers
// against a corrected correctAnswer (e.g. typo fixes like "speacial" → "special").
function levenshtein(a, b) {
  const s1 = String(a ?? '');
  const s2 = String(b ?? '');
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Considers two answers "the same" if they differ by no more than ~10% of the longer string.
// This is conservative enough to ignore distinct multiple-choice options ("U0130" vs "U0140",
// "point X" vs "point Y") while catching single-letter typos in long answer strings.
function fuzzyAnswerMatch(a, b, threshold = 0.9) {
  const s1 = normalizeAnswer(a);
  const s2 = normalizeAnswer(b);
  if (s1 === s2) return true;
  const longer = Math.max(s1.length, s2.length);
  if (longer === 0) return true;
  return (longer - levenshtein(s1, s2)) / longer >= threshold;
}

/**
 * Re-grade every QuizSubmission that references a given question, after the
 * question's options/correctAnswer have been edited.
 *
 * Strategy, in order:
 *   1. If the option text the user originally selected got rewritten in place
 *      (same index, different text), remap the stored selectedAnswer to the
 *      new option text.
 *   2. Mark isCorrect = true if selectedAnswer === correctAnswer (trimmed).
 *   3. Otherwise, mark isCorrect = true if the two are within ~10% edit distance
 *      (rescues users penalised by an instructor's typo correction even when
 *      the option text itself wasn't part of the diff).
 *   4. Recompute the submission's score from the updated answers.
 */
async function regradeQuestionSubmissions(question, oldOptions = []) {
  if (question.questionType !== 'multiple-choice') return;

  const newOptions = question.options || [];
  const optionMap = new Map();
  if (Array.isArray(oldOptions) && oldOptions.length === newOptions.length) {
    oldOptions.forEach((oldOpt, idx) => {
      const newOpt = newOptions[idx];
      if (oldOpt != null && newOpt != null && oldOpt !== newOpt) {
        optionMap.set(oldOpt, newOpt);
      }
    });
  }

  const submissions = await QuizSubmission.find({ 'answers.question': question._id });

  for (const submission of submissions) {
    let changed = false;
    submission.answers.forEach((answer) => {
      if (String(answer.question) !== String(question._id)) return;

      if (optionMap.has(answer.selectedAnswer)) {
        answer.selectedAnswer = optionMap.get(answer.selectedAnswer);
        changed = true;
      }

      let newIsCorrect =
        normalizeAnswer(answer.selectedAnswer) === normalizeAnswer(question.correctAnswer);
      if (!newIsCorrect) {
        newIsCorrect = fuzzyAnswerMatch(answer.selectedAnswer, question.correctAnswer);
      }

      if (answer.isCorrect !== newIsCorrect) {
        answer.isCorrect = newIsCorrect;
        changed = true;
      }
    });

    if (submission.answers.length > 0) {
      const correctCount = submission.answers.filter((a) => a.isCorrect).length;
      const newScore = (correctCount / submission.answers.length) * 100;
      if (submission.score !== newScore) {
        submission.score = newScore;
        changed = true;
      }
    }

    if (changed) await submission.save();
  }
}

/**
 * @route POST /api/quizzes/create
 * @desc Create a new quiz
 */
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

/**
 * @route GET /api/quizzes
 * @desc Get all quizzes
 */
router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate('questions');
    res.json(quizzes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route GET /api/quizzes/published
 * @desc Get published quizzes
 */
router.get('/published', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ isPublished: true }).populate('questions');
    res.json(quizzes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route PUT /api/quizzes/:quizId/publish
 * @desc Toggle quiz published state
 */
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

/**
 * @route POST /api/quizzes/:quizId/add-question
 * @desc Add a question (with optional image) to a quiz
 */
router.post('/:quizId/add-question', upload.single('questionImage'), async (req, res) => {
  try {
    const { questionText, correctAnswer, questionType } = req.body;

    // Parse options array from JSON
    let options = [];
    if (req.body.options) {
      options = JSON.parse(req.body.options);
    }

    // If file was uploaded, push to S3 and store returned URL
    let imagePath = '';
    if (req.file) {
      const key = `quiz-images/${Date.now()}-${req.file.originalname}`;
      imagePath = await uploadBufferToS3(req.file.buffer, key, req.file.mimetype);
    }

    const newQuestion = new QuizQuestion({
      questionText,
      options,
      correctAnswer,
      image: imagePath,
      questionType: questionType || 'multiple-choice',
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

/**
 * @route PUT /api/quizzes/:quizId/question/:questionId
 * @desc Update a specific question (with optional new image)
 */
router.put('/:quizId/question/:questionId', upload.single('questionImage'), async (req, res) => {
  try {
    const { questionText, correctAnswer, questionType } = req.body;

    // Parse options array from JSON
    let options = [];
    if (req.body.options) {
      options = JSON.parse(req.body.options);
    }

    // Capture pre-update state so we can re-grade past submissions when grading-relevant
    // fields change (typo fixes, option rewording, swapped correct answer, etc.).
    const previousQuestion = await QuizQuestion.findById(req.params.questionId);
    if (!previousQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }
    const oldOptions = previousQuestion.options || [];

    // If a new file is uploaded, push to S3 and store URL
    let imagePath;
    if (req.file) {
      const key = `quiz-images/${Date.now()}-${req.file.originalname}`;
      imagePath = await uploadBufferToS3(
        req.file.buffer,
        key,
        req.file.mimetype
      );
    }

    // Build update object
    const updateData = {
      questionText,
      options,
      correctAnswer,
      questionType,
    };
    // Only set image field if a new image was provided
    if (typeof imagePath !== 'undefined') {
      updateData.image = imagePath;
    }

    const question = await QuizQuestion.findByIdAndUpdate(
      req.params.questionId,
      updateData,
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Always re-grade past submissions for this question. The helper applies an option
    // remap (when option text changed in place), then exact-trim comparison, then a fuzzy
    // fallback so a typo correction in correctAnswer rescues the previously-penalised users.
    await regradeQuestionSubmissions(question, oldOptions);

    res.json(question);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route POST /api/quizzes/:quizId/question/:questionId/regrade
 * @desc Re-grade past submissions for a question without editing it.
 *       Applies the same fuzzy-tolerant logic used by the PUT route — useful
 *       when a typo was already fixed before the auto-regrade existed.
 */
router.post('/:quizId/question/:questionId/regrade', async (req, res) => {
  try {
    const question = await QuizQuestion.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    if (question.questionType !== 'multiple-choice') {
      return res.status(400).json({
        message: 'Only multiple-choice questions support automatic re-grading.',
      });
    }
    // Pass current options as "old" so no remap fires; the trim + fuzzy fallback do the work.
    await regradeQuestionSubmissions(question, question.options || []);
    res.json({ message: 'Re-grade complete.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route DELETE /api/quizzes/:quizId/question/:questionId
 * @desc Delete a specific question from a quiz
 */
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

/**
 * @route DELETE /api/questions/:questionId/image
 * @desc Remove an image from a question and delete from S3
 */
router.delete('/questions/:questionId/image', async (req, res) => {
  try {
    const question = await QuizQuestion.findById(req.params.questionId);
    if (!question || !question.image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const key = new URL(question.image).pathname.slice(1);
    await deleteFromS3(key);

    question.image = '';
    await question.save();

    res.json({ message: 'Image removed' });
  } catch (error) {
    console.error('Error removing image:', error);
    res.status(500).json({ message: 'Error removing image' });
  }
});

/**
 * @route DELETE /api/quizzes/:quizId
 * @desc Delete a quiz by ID (removes related questions and submissions)
 */
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

/**
 * @route GET /api/quizzes/:quizId
 * @desc Get a specific quiz by ID
 */
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

/**
 * @route POST /api/quizzes/:quizId/submit
 * @desc Submit quiz answers and calculate the score
 */
router.post('/:quizId/submit', async (req, res) => {
  const { answers, studentId } = req.body;
  try {
    const quiz = await Quiz.findById(req.params.quizId).populate('questions');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Check if the quiz is locked due to due date
    const currentDate = new Date();
    const dueDate = new Date(quiz.dueDate);
    if (currentDate > dueDate && !quiz.allowLateSubmissions) {
      return res
        .status(400)
        .json({ message: 'This quiz is closed for submissions.' });
    }

    if (!quiz.allowMultipleSubmissions) {
      const existingSubmission = await QuizSubmission.findOne({
        student: studentId,
        quiz: quiz._id,
      });
      if (existingSubmission) {
        return res
          .status(400)
          .json({ message: 'You have already submitted this quiz.' });
      }
    }

    let correctAnswers = 0;
    const answerArray = [];

    quiz.questions.forEach((question) => {
      const selectedAnswer = answers[question._id];
      let isCorrect = false;

      // For multiple-choice questions, check if selected answer is correct.
      // Uses the shared normalizer so whitespace differences don't mark a right answer wrong.
      if (question.questionType === 'multiple-choice') {
        isCorrect = normalizeAnswer(selectedAnswer) === normalizeAnswer(question.correctAnswer);
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

/**
 * @route PUT /api/quizzes/:quizId/toggle-multiple-submissions
 * @desc Toggle multiple submissions for a quiz
 */
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
