// student-evaluation-app/server/routes/cohorts.js
const express = require('express');
const router = express.Router();
const {
  createCohort,
  getCohorts,
  deactivateCohort,
} = require('../controllers/cohortController');

router.post('/', createCohort);
router.get('/', getCohorts);
router.put('/:id/deactivate', deactivateCohort);

module.exports = router;
