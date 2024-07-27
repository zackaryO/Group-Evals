const EvaluationArea = require('../models/EvaluationArea');

const setEvaluationAreas = async (req, res) => {
  const { area1, area2, area3, area4 } = req.body;
  try {
    const newAreas = new EvaluationArea({ area1, area2, area3, area4 });
    await newAreas.save();
    res.status(201).json(newAreas);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getEvaluationAreas = async (req, res) => {
  try {
    const areas = await EvaluationArea.findOne();
    res.json(areas);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { setEvaluationAreas, getEvaluationAreas };
