// student-evaluation-app/server/routes/cohorts.js
const express = require('express');
const router = express.Router();
const {
  createCohort,
  getCohorts,
  updateCohort,
  setCohortActive,
  deactivateCohort,
  deleteCohort,
} = require('../controllers/cohortController');

router.post('/', createCohort);
router.get('/', getCohorts);
router.put('/:id', updateCohort);
router.put('/:id/active', setCohortActive);
router.put('/:id/deactivate', deactivateCohort);
router.delete('/:id', deleteCohort);

module.exports = router;
