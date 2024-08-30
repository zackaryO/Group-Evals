// student-evaluation-app/server/controllers/gradeController.js
const Grade = require('../models/Grade');

const getGrades = async (req, res) => {
  try {
    const grades = await Grade.find()
      .populate('student', 'username firstName lastName') // Populate student details
      .populate('quiz', 'title'); // Populate quiz title

    res.status(200).json(grades);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

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

module.exports = { getGrades, deleteGrade };
