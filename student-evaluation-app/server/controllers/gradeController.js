// student-evaluation-app/server/controllers/gradeController.js

const Grade = require('../models/Grade');
const User = require('../models/User');
const Course = require('../models/Course');

// Get grades with optional filters for studentId and courseId
const getGrades = async (req, res) => {
  try {
    const { studentId, courseId } = req.query;

    const query = {};
    if (studentId) query.student = studentId;
    if (courseId) query.course = courseId;

    const grades = await Grade.find(query)
      .populate('student', 'username firstName lastName')
      .populate('course', 'title')
      .populate({
        path: 'assessment',
        select: 'title assessmentModel',
        populate: {
          path: 'course',
          select: 'title',
        },
      });

    res.status(200).json(grades);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get overall grades for all students
const getOverallGrades = async (req, res) => {
  try {
    const grades = await Grade.find()
      .populate('student', 'username firstName lastName')
      .populate('course', 'title')
      .populate('assessment', 'title assessmentModel');

    // Weighting factors
    const weightings = { Quiz: 50, Assignment: 30, Evaluation: 20 };

    const studentGrades = {};

    grades.forEach((grade) => {
      const studentId = grade.student._id.toString();
      if (!studentGrades[studentId]) {
        studentGrades[studentId] = {
          student: grade.student,
          totalScore: 0,
          totalWeight: 0,
        };
      }

      // Access assessmentModel from the populated assessment
      const assessmentModel = grade.assessment.assessmentModel;
      const weight = weightings[assessmentModel] || 0;

      studentGrades[studentId].totalScore += (grade.score * weight) / 100;
      studentGrades[studentId].totalWeight += weight;
    });

    const overallGrades = Object.values(studentGrades).map((item) => ({
      student: item.student,
      overallScore: item.totalWeight
        ? ((item.totalScore / item.totalWeight) * 100).toFixed(2)
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
    const grade = await Grade.findByIdAndDelete(id);
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }
    res.status(200).json({ message: 'Grade deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get student progress (overall and by course)
const getStudentProgress = async (req, res) => {
  const { studentId } = req.params;

  try {
    // Fetch all grades for the student
    const grades = await Grade.find({ student: studentId })
      .populate('course', 'title weightingFactors')
      .populate('assessment', 'title assessmentModel');

    // Group grades by course
    const courses = {};

    grades.forEach((grade) => {
      const courseId = grade.course ? grade.course._id.toString() : 'Unknown';
      if (!courses[courseId]) {
        courses[courseId] = {
          courseId,
          courseTitle: grade.course ? grade.course.title : 'No Course Assigned',
          weightingFactors: grade.course ? grade.course.weightingFactors : null,
          assessments: [],
        };
      }

      courses[courseId].assessments.push({
        score: grade.score,
        assessmentModel: grade.assessment.assessmentModel,
      });
    });

    const coursesProgress = [];

    // For each course, calculate the weighted grade
    for (const courseId in courses) {
      const course = courses[courseId];
      const weightingFactors = course.weightingFactors || { quiz: 1, assignment: 1, evaluation: 1 };

      // Sum up the total weights
      const totalWeights = Object.values(weightingFactors).reduce((a, b) => a + b, 0);

      let totalScore = 0;
      let totalPossibleScore = 0;

      // Count the number of assessments per type
      const assessmentCounts = {};

      course.assessments.forEach((assessment) => {
        const type = assessment.assessmentModel.toLowerCase();
        if (!assessmentCounts[type]) assessmentCounts[type] = 0;
        assessmentCounts[type] += 1;
      });

      // For each assessment type, calculate the weighted score
      for (const [type, weight] of Object.entries(weightingFactors)) {
        const typeAssessments = course.assessments.filter(
          (a) => a.assessmentModel.toLowerCase() === type
        );
        const typeScore = typeAssessments.reduce((sum, a) => sum + a.score, 0);
        const typeCount = typeAssessments.length;
        const possibleScore = typeCount * 100;

        const weightedScore = possibleScore > 0 ? (typeScore / possibleScore) * weight : 0;

        totalScore += weightedScore;
        totalPossibleScore += weight;
      }

      const progress = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;

      coursesProgress.push({
        courseId: course.courseId,
        courseTitle: course.courseTitle,
        progress: progress.toFixed(2),
      });
    }

    // Calculate overall progress by averaging course progress
    const overallProgress =
      coursesProgress.length > 0
        ? (
            coursesProgress.reduce((sum, course) => sum + parseFloat(course.progress), 0) /
            coursesProgress.length
          ).toFixed(2)
        : 0;

    res.status(200).json({ coursesProgress, overallProgress });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get progress for all students (instructor view)
const getAllStudentsProgress = async (req, res) => {
  try {
    const grades = await Grade.find()
      .populate('student', 'firstName lastName')
      .populate('course', 'title weightingFactors')
      .populate('assessment', 'title assessmentModel');

    const studentGrades = {};

    grades.forEach((grade) => {
      const studentId = grade.student._id.toString();
      if (!studentGrades[studentId]) {
        studentGrades[studentId] = {
          studentId: grade.student._id,
          studentName: `${grade.student.firstName} ${grade.student.lastName}`,
          courses: {},
        };
      }

      const courseId = grade.course ? grade.course._id.toString() : 'Unknown';
      if (!studentGrades[studentId].courses[courseId]) {
        studentGrades[studentId].courses[courseId] = {
          courseTitle: grade.course ? grade.course.title : 'No Course Assigned',
          weightingFactors: grade.course ? grade.course.weightingFactors : null,
          assessments: [],
        };
      }

      studentGrades[studentId].courses[courseId].assessments.push({
        score: grade.score,
        assessmentModel: grade.assessment.assessmentModel,
      });
    });

    const progressData = [];

    for (const studentId in studentGrades) {
      const student = studentGrades[studentId];
      const coursesProgress = [];
      for (const courseId in student.courses) {
        const course = student.courses[courseId];
        const weightingFactors = course.weightingFactors || { quiz: 1, assignment: 1, evaluation: 1 };

        let totalScore = 0;
        let totalPossibleScore = 0;

        for (const [type, weight] of Object.entries(weightingFactors)) {
          const typeAssessments = course.assessments.filter(
            (a) => a.assessmentModel.toLowerCase() === type
          );
          const typeScore = typeAssessments.reduce((sum, a) => sum + a.score, 0);
          const typeCount = typeAssessments.length;
          const possibleScore = typeCount * 100;

          const weightedScore = possibleScore > 0 ? (typeScore / possibleScore) * weight : 0;

          totalScore += weightedScore;
          totalPossibleScore += weight;
        }

        const progress = totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;

        coursesProgress.push({
          courseId,
          courseTitle: course.courseTitle,
          progress: progress.toFixed(2),
        });
      }

      const overallProgress =
        coursesProgress.length > 0
          ? (
              coursesProgress.reduce((sum, course) => sum + parseFloat(course.progress), 0) /
              coursesProgress.length
            ).toFixed(2)
          : 0;

      progressData.push({
        studentId: student.studentId,
        studentName: student.studentName,
        overallProgress,
        coursesProgress,
      });
    }

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