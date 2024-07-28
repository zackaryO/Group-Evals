const EvaluationArea = require('../models/EvaluationArea');

// Get all evaluation areas
const getAreas = async (req, res) => {
  try {
    const areas = await EvaluationArea.find();
    res.json(areas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new evaluation area
const createArea = async (req, res) => {
  const { name, description } = req.body;
  const newArea = new EvaluationArea({ name, description });
  try {
    await newArea.save();
    res.status(201).json(newArea);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update an evaluation area
const updateArea = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const area = await EvaluationArea.findById(id);
    if (!area) {
      return res.status(404).json({ message: 'Evaluation area not found' });
    }
    area.name = name || area.name;
    area.description = description || area.description;
    await area.save();
    res.json(area);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete an evaluation area
const deleteArea = async (req, res) => {
  const { id } = req.params;
  try {
    const area = await EvaluationArea.findById(id);
    if (!area) {
      return res.status(404).json({ message: 'Evaluation area not found' });
    }
    await area.remove();
    res.json({ message: 'Evaluation area deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAreas, createArea, updateArea, deleteArea };
