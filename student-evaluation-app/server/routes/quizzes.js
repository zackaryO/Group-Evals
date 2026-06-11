// student-evaluation-app/server/routes/quizzes.js

const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizQuestion = require('../models/QuizQuestion');
const QuizSubmission = require('../models/QuizSubmission');
const User = require('../models/User');
const multer = require('multer');

const { uploadBufferToS3, deleteFromS3 } = require('../utils/s3');
const {
  authenticateToken,
  authorizeRoles,
  FULL_INSTRUCTOR_ROLES,
  INSTRUCTOR_TIER_ROLES,
  isFullInstructor,
} = require('../middleware/authMiddleware');


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

// ───────────────────────────────────────── Quiz permission helpers
//
// A full instructor (instructor/admin) may edit/delete/assign any quiz. An
// electrical instructor may only edit quizzes they own or quizzes flagged
// `sharedWithElectrical` (the "A6 ASE practice 1" exception), may only delete
// quizzes they own, and may only assign (to their electrical roster) quizzes
// they may edit.

const ownsQuiz = (user, quiz) => String(quiz.instructor) === String(user.id);

// Can edit a quiz's questions/settings (owner, shared, or full instructor).
const canEditQuiz = (user, quiz) =>
  isFullInstructor(user.role) || ownsQuiz(user, quiz) || !!quiz.sharedWithElectrical;

// Can delete a quiz outright (owner or full instructor only — never shared).
const canDeleteQuiz = (user, quiz) =>
  isFullInstructor(user.role) || ownsQuiz(user, quiz);

// Can assign/unassign to the caller's own electrical-student roster (same set
// of quizzes they may edit: owned + shared).
const canAssignElectrical = (user, quiz) => canEditQuiz(user, quiz);

/**
 * Express middleware factory: loads req.params.quizId, 404s if missing, then
 * runs `check(req.user, quiz)`. On pass, attaches req.quiz and continues; on
 * fail, returns 403. Use after authenticateToken + authorizeRoles.
 */
const requireQuizPermission = (check) => async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (!check(req.user, quiz)) {
      return res.status(403).json({ message: 'You are not allowed to modify this quiz.' });
    }
    req.quiz = quiz;
    next();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

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
  // Only skip for explicitly open-ended questions; older docs may have an undefined
  // questionType field (predates the schema default) and should still be auto-graded.
  if (question.questionType === 'open-ended') return;

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
 * @desc Create a new quiz. The owner is always the authenticated user (the
 *       client-supplied instructorId is ignored for security).
 */
router.post('/create', authenticateToken, authorizeRoles(...INSTRUCTOR_TIER_ROLES), async (req, res) => {
  const {
    title,
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
      instructor: req.user.id,
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
 * @desc Get all quizzes (instructor tier only — used by the quiz manager).
 */
router.get('/', authenticateToken, authorizeRoles(...INSTRUCTOR_TIER_ROLES), async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate('questions');
    res.json(quizzes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route GET /api/quizzes/published
 * @desc Get the quizzes the caller is allowed to take.
 *       - electrical_student: only quizzes the instructor who added them has
 *         assigned to their roster (electricalAssignedBy contains addedBy).
 *       - everyone else: all globally published quizzes (existing behavior).
 */
router.get('/published', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'electrical_student') {
      const me = await User.findById(req.user.id).select('addedBy');
      if (!me || !me.addedBy) {
        return res.json([]); // No owning instructor → nothing assigned.
      }
      const quizzes = await Quiz.find({ electricalAssignedBy: me.addedBy }).populate('questions');
      return res.json(quizzes);
    }

    const quizzes = await Quiz.find({ isPublished: true }).populate('questions');
    res.json(quizzes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route PUT /api/quizzes/:quizId/publish
 * @desc Toggle a quiz's GLOBAL published state (regular-student visibility).
 *       Full instructors only — electrical instructors use /electrical-assign.
 */
router.put('/:quizId/publish', authenticateToken, authorizeRoles(...FULL_INSTRUCTOR_ROLES), async (req, res) => {
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
 * @route PUT /api/quizzes/:quizId/electrical-assign
 * @desc Assign or unassign this quiz to the caller's own electrical-student
 *       roster. Allowed only for quizzes the caller may edit (owned or shared).
 *       Body: { assign: boolean } — when omitted, toggles current membership.
 */
router.put(
  '/:quizId/electrical-assign',
  authenticateToken,
  authorizeRoles(...INSTRUCTOR_TIER_ROLES),
  requireQuizPermission(canAssignElectrical),
  async (req, res) => {
    try {
      const quiz = req.quiz;
      const meId = String(req.user.id);
      const already = (quiz.electricalAssignedBy || []).some((id) => String(id) === meId);
      const assign = typeof req.body.assign === 'boolean' ? req.body.assign : !already;

      if (assign && !already) {
        quiz.electricalAssignedBy.push(req.user.id);
      } else if (!assign && already) {
        quiz.electricalAssignedBy = quiz.electricalAssignedBy.filter((id) => String(id) !== meId);
      }
      await quiz.save();
      res.json(quiz);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

/**
 * @route PUT /api/quizzes/:quizId/shared-electrical
 * @desc Set whether this quiz is a shared resource any electrical instructor
 *       may edit/assign (the "A6 ASE practice 1" exception). Full instructors
 *       only. Body: { sharedWithElectrical: boolean }.
 */
router.put('/:quizId/shared-electrical', authenticateToken, authorizeRoles(...FULL_INSTRUCTOR_ROLES), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    quiz.sharedWithElectrical = !!req.body.sharedWithElectrical;
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
router.post(
  '/:quizId/add-question',
  authenticateToken,
  authorizeRoles(...INSTRUCTOR_TIER_ROLES),
  upload.single('questionImage'),
  requireQuizPermission(canEditQuiz),
  async (req, res) => {
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
router.put(
  '/:quizId/question/:questionId',
  authenticateToken,
  authorizeRoles(...INSTRUCTOR_TIER_ROLES),
  upload.single('questionImage'),
  requireQuizPermission(canEditQuiz),
  async (req, res) => {
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
router.post(
  '/:quizId/question/:questionId/regrade',
  authenticateToken,
  authorizeRoles(...INSTRUCTOR_TIER_ROLES),
  requireQuizPermission(canEditQuiz),
  async (req, res) => {
  try {
    const question = await QuizQuestion.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    if (question.questionType === 'open-ended') {
      return res.status(400).json({
        message: 'Open-ended questions are not auto-graded.',
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
router.delete(
  '/:quizId/question/:questionId',
  authenticateToken,
  authorizeRoles(...INSTRUCTOR_TIER_ROLES),
  requireQuizPermission(canEditQuiz),
  async (req, res) => {
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
router.delete('/questions/:questionId/image', authenticateToken, authorizeRoles(...INSTRUCTOR_TIER_ROLES), async (req, res) => {
  try {
    const question = await QuizQuestion.findById(req.params.questionId);
    if (!question || !question.image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Ownership: derive the owning quiz from the question and apply the same
    // edit rule as the other question routes.
    const quiz = await Quiz.findById(question.quiz);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (!canEditQuiz(req.user, quiz)) {
      return res.status(403).json({ message: 'You are not allowed to modify this quiz.' });
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
router.delete(
  '/:quizId',
  authenticateToken,
  authorizeRoles(...INSTRUCTOR_TIER_ROLES),
  requireQuizPermission(canDeleteQuiz),
  async (req, res) => {
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
 * @desc Get a specific quiz by ID (instructor tier — used by the editor).
 */
router.get('/:quizId', authenticateToken, authorizeRoles(...INSTRUCTOR_TIER_ROLES), async (req, res) => {
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
router.post('/:quizId/submit', authenticateToken, async (req, res) => {
  const { answers, studentId } = req.body;
  try {
    const quiz = await Quiz.findById(req.params.quizId).populate('questions');
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // A student may only submit their own attempt.
    if (String(req.user.id) !== String(studentId)) {
      return res.status(403).json({ message: 'You can only submit your own quiz.' });
    }

    // Electrical students may only submit quizzes assigned to their roster.
    if (req.user.role === 'electrical_student') {
      const me = await User.findById(req.user.id).select('addedBy');
      const assigned =
        me && me.addedBy &&
        (quiz.electricalAssignedBy || []).some((id) => String(id) === String(me.addedBy));
      if (!assigned) {
        return res.status(403).json({ message: 'This quiz is not assigned to you.' });
      }
    }

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
router.put(
  '/:quizId/toggle-multiple-submissions',
  authenticateToken,
  authorizeRoles(...INSTRUCTOR_TIER_ROLES),
  requireQuizPermission(canEditQuiz),
  async (req, res) => {
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
