const Area = require('../models/EvaluationArea');

const getAreas = async (req, res) => {
  try {
    const areas = await Area.findOne();
    res.json(areas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const setAreas = async (req, res) => {
  try {
    const existingAreas = await Area.findOne();
    if (existingAreas) {
      return res.status(400).json({ message: 'Areas already exist. Use update to change them.' });
    }
    const areas = new Area(req.body);
    await areas.save();
    res.status(201).json(areas);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const updateAreas = async (req, res) => {
  try {
    const areas = await Area.findOneAndUpdate({}, req.body, { new: true });
    res.json(areas);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getAreas, setAreas, updateAreas };
