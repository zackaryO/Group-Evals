// student-evaluation-app/server/controllers/assignmentController.js
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Grade = require('../models/Grade');

const createAssignment = async (req, res) => {
  const {
    title,
    description,
    dueDate,
    allowLateSubmission,
    latePenalty,
    cohort,
    course,
    createdBy,
  } = req.body;
  try {
    const assignment = new Assignment({
      title,
      description,
      dueDate,
      allowLateSubmission,
      latePenalty,
      cohort,
      course,
      createdBy,
    });
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitAssignment = async (req, res) => {
  const { studentId, content } = req.body;
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const currentDate = new Date();
    const dueDate = new Date(assignment.dueDate);
    if (currentDate > dueDate && !assignment.allowLateSubmission) {
      return res.status(400).json({ message: 'This assignment is closed for submissions.' });
    }

    let latePenalty = 0;
    if (currentDate > dueDate && assignment.allowLateSubmission) {
      const daysLate = Math.ceil((currentDate - dueDate) / (1000 * 60 * 60 * 24));
      latePenalty = daysLate * assignment.latePenalty;
    }

    const submission = new AssignmentSubmission({
      assignment: assignment._id,
      student: studentId,
      content,
      latePenalty,
    });
    await submission.save();
    res.status(201).json({ message: 'Assignment submitted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ assignment: req.params.assignmentId })
      .populate('student', 'firstName lastName');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const gradeSubmission = async (req, res) => {
  const { grade } = req.body;
  try {
    const submission = await AssignmentSubmission.findById(req.params.submissionId).populate(
      'assignment'
    );
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    submission.grade = grade;
    await submission.save();

    // Save the grade in the Grade model
    const assignmentGrade = new Grade({
      student: submission.student,
      assessment: submission.assignment._id,
      assessmentModel: 'Assignment',
      score: grade,
      course: submission.assignment.course,
    });
    await assignmentGrade.save();

    res.json({ message: 'Grade updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAssignment,
  getAssignmentById,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
};
