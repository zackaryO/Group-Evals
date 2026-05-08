// student-evaluation-app/server/controllers/cohortController.js
const Cohort = require('../models/Cohort');
const User = require('../models/User');

const createCohort = async (req, res) => {
  const { name, gradDate } = req.body;
  try {
    const cohort = new Cohort({ name, gradDate });
    await cohort.save();
    res.status(201).json(cohort);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getCohorts = async (req, res) => {
  try {
    const cohorts = await Cohort.find()
      .populate('students', 'firstName lastName username isActive')
      .lean();
    res.json(cohorts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCohort = async (req, res) => {
  const { name, gradDate } = req.body;
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });
    if (name !== undefined) cohort.name = name;
    if (gradDate !== undefined) cohort.gradDate = gradDate;
    await cohort.save();
    res.json(cohort);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Toggle cohort active state. When cascade=true, also flips isActive on every
// student currently in the cohort to match.
const setCohortActive = async (req, res) => {
  const { isActive, cascade } = req.body;
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });
    cohort.isActive = !!isActive;
    await cohort.save();

    if (cascade && Array.isArray(cohort.students) && cohort.students.length) {
      await User.updateMany(
        { _id: { $in: cohort.students } },
        { $set: { isActive: !!isActive } }
      );
    }

    const refreshed = await Cohort.findById(cohort._id)
      .populate('students', 'firstName lastName username isActive')
      .lean();
    res.json(refreshed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Kept for backward compatibility with the original deactivate-only endpoint.
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

const deleteCohort = async (req, res) => {
  try {
    const cohort = await Cohort.findById(req.params.id);
    if (!cohort) return res.status(404).json({ message: 'Cohort not found' });
    // Detach any students still pointing at this cohort so we don't orphan refs.
    await User.updateMany({ cohort: cohort._id }, { $set: { cohort: null } });
    await Cohort.deleteOne({ _id: cohort._id });
    res.json({ message: 'Cohort deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCohort,
  getCohorts,
  updateCohort,
  setCohortActive,
  deactivateCohort,
  deleteCohort,
};
