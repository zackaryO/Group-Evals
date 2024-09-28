// student-evaluation-app/server/controllers/courseController.js
const Course = require('../models/Course');

const createCourse = async (req, res) => {
  const { title, description, cohortId } = req.body;
  try {
    const course = new Course({ title, description, cohort: cohortId });
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate('cohort', 'name');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const attachQuiz = async (req, res) => {
  const { quizId } = req.body;
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    course.assessments.push(quizId);
    await course.save();
    res.json({ message: 'Quiz attached to course successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Method to update weighting factors for a course
const updateWeightingFactors = async (req, res) => {
  const { id } = req.params; // Course ID
  const { weightingFactors } = req.body; // { quiz: Number, assignment: Number, evaluation: Number }

  try {
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Update weighting factors
    course.weightingFactors = {
      ...course.weightingFactors,
      ...weightingFactors,
    };

    await course.save();
    res.json({ message: 'Weighting factors updated successfully', course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createCourse, getCourses, deleteCourse, attachQuiz, updateWeightingFactors, };
