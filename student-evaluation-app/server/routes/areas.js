const express = require('express');
const { getAreas, createArea, updateArea, deleteArea } = require('../controllers/areasController');
const router = express.Router();

router.get('/', getAreas);
router.post('/', createArea);
router.put('/:id', updateArea);
router.delete('/:id', deleteArea);

module.exports = router;
