// student-evaluation-app/server/controllers/gradeController.js

const QuizSubmission = require('../models/QuizSubmission');
const User = require('../models/User');
const Course = require('../models/Course');

// Get grades with optional filters for studentId and quizId
const getGrades = async (req, res) => {
  try {
    const { studentId, quizId } = req.query;

    const query = {};
    if (studentId) query.student = studentId;
    if (quizId) query.quiz = quizId;

    // Scope results by role:
    //  - student / electrical_student: only their own submissions.
    //  - electrical_instructor: only submissions by the electrical students
    //    they added.
    //  - support_staff / instructor / admin: everything (no extra restriction).
    if (req.user.role === 'student' || req.user.role === 'electrical_student') {
      query.student = req.user.id;
    } else if (req.user.role === 'electrical_instructor') {
      const roster = await User.find({
        role: 'electrical_student',
        addedBy: req.user.id,
      }).select('_id');
      query.student = { $in: roster.map((s) => s._id) };
    }

    console.log('Grades Query:', query); // Log to see the query being used

    let gradesQuery = QuizSubmission.find(query)
      .populate({
        path: 'student',
        select: 'username firstName lastName isActive cohort',
        populate: { path: 'cohort', select: 'name isActive' },
      })
      .populate('quiz', 'title');

    // Support staff may see scores but NOT quiz-question content, so we skip the
    // answers.question population (which would expose questionText/correctAnswer)
    // for them. Everyone else gets the per-question detail for the gradebook.
    if (req.user.role !== 'support_staff') {
      gradesQuery = gradesQuery.populate({
        path: 'answers.question',
        model: 'QuizQuestion', // Ensure this matches the model name
        // questionType/key/section let the manual-grading UI tell free-response
        // answers apart and order them within a template-driven quiz.
        select: 'questionText correctAnswer image options questionType key section',
      });
    }

    const grades = await gradesQuery;

    res.status(200).json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error.message); // Log any errors
    res.status(400).json({ error: error.message });
  }
};

// Get overall grades for all students
const getOverallGrades = async (req, res) => {
  try {
    const grades = await QuizSubmission.find()
      .populate('student', 'username firstName lastName')
      .populate('quiz', 'title');

    const studentGrades = {};

    grades.forEach((grade) => {
      const studentId = grade.student._id.toString();
      if (!studentGrades[studentId]) {
        studentGrades[studentId] = {
          student: grade.student,
          totalScore: 0,
          totalQuizzes: 0,
        };
      }

      studentGrades[studentId].totalScore += grade.score;
      studentGrades[studentId].totalQuizzes += 1;
    });

    const overallGrades = Object.values(studentGrades).map((item) => ({
      student: item.student,
      overallScore: item.totalQuizzes
        ? (item.totalScore / item.totalQuizzes).toFixed(2)
        : 0,
    }));

    res.status(200).json(overallGrades);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a grade by ID
const deleteGrade = async (req, res) => {
  const { id } = req.params;
  try {
    const grade = await QuizSubmission.findById(id).populate('student', 'role addedBy');
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // Electrical instructors may only delete scores belonging to the electrical
    // students they added.
    if (req.user.role === 'electrical_instructor') {
      const ownsStudent =
        grade.student &&
        grade.student.role === 'electrical_student' &&
        String(grade.student.addedBy) === String(req.user.id);
      if (!ownsStudent) {
        return res.status(403).json({ message: 'Not authorized to delete this score.' });
      }
    }

    await grade.deleteOne();
    res.status(200).json({ message: 'Grade deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get student progress (overall by quizzes)
const getStudentProgress = async (req, res) => {
  const { studentId } = req.params;

  try {
    // Fetch all quiz submissions for the student
    const grades = await QuizSubmission.find({ student: studentId })
      .populate('quiz', 'title');

    if (!grades || grades.length === 0) {
      return res.status(404).json({ message: 'No grades found for this student' });
    }

    let totalScore = 0;
    let totalQuizzes = grades.length;

    grades.forEach((grade) => {
      totalScore += grade.score;
    });

    const overallProgress = totalQuizzes > 0 ? (totalScore / totalQuizzes).toFixed(2) : 0;

    res.status(200).json({ totalQuizzes, overallProgress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get progress for all students (instructor view)
const getAllStudentsProgress = async (req, res) => {
  try {
    const grades = await QuizSubmission.find()
      .populate('student', 'firstName lastName')
      .populate('quiz', 'title');

    const studentGrades = {};

    grades.forEach((grade) => {
      const studentId = grade.student._id.toString();
      if (!studentGrades[studentId]) {
        studentGrades[studentId] = {
          studentId: grade.student._id,
          studentName: `${grade.student.firstName} ${grade.student.lastName}`,
          totalScore: 0,
          totalQuizzes: 0,
        };
      }

      studentGrades[studentId].totalScore += grade.score;
      studentGrades[studentId].totalQuizzes += 1;
    });

    const progressData = Object.values(studentGrades).map((student) => ({
      studentId: student.studentId,
      studentName: student.studentName,
      overallProgress: student.totalQuizzes > 0
        ? (student.totalScore / student.totalQuizzes).toFixed(2)
        : 0,
    }));

    res.status(200).json(progressData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getGrades,
  getOverallGrades,
  getStudentProgress,
  getAllStudentsProgress,
  deleteGrade,
};
