// student-evaluation-app/server/controllers/cohortController.js
const Cohort = require('../models/Cohort');

const createCohort = async (req, res) => {
  const { name, startDate } = req.body;
  try {
    const cohort = new Cohort({ name, startDate });
    await cohort.save();
    res.status(201).json(cohort);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getCohorts = async (req, res) => {
  try {
    const cohorts = await Cohort.find().populate('students', 'firstName lastName');
    res.json(cohorts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deactivateCohort = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });
    cohort.isActive = false;
    await cohort.save();
    res.json({ message: 'Cohort deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createCohort, getCohorts, deactivateCohort };
