/**
 * facilityNeedController.js
 *
 * CRUD operations for FacilityNeed model.
 * Only instructors should access these routes (enforced at the route level).
 */

const FacilityNeed = require('../models/FacilityNeed');

/**
 * GET /api/facility-needs
 * Retrieve all facility needs.
 */
exports.getAllFacilityNeeds = async (req, res) => {
  try {
    const needs = await FacilityNeed.find().sort({ createdAt: -1 });
    return res.json(needs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/facility-needs/:id
 * Retrieve a single facility need by ID.
 */
exports.getFacilityNeedById = async (req, res) => {
  try {
    const need = await FacilityNeed.findById(req.params.id);
    if (!need) {
      return res.status(404).json({ message: 'Facility need not found' });
    }
    return res.json(need);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/facility-needs
 * Create a new facility need/improvement.
 */
exports.createFacilityNeed = async (req, res) => {
  try {
    const { description, status, priority, assignedTo } = req.body;

    // If multiple images are uploaded
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.location);
    }

    const newNeed = new FacilityNeed({
      description,
      status,
      priority,
      assignedTo,
      images,
    });

    const savedNeed = await newNeed.save();
    return res.status(201).json(savedNeed);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/facility-needs/:id
 * Update an existing facility need.
 */
exports.updateFacilityNeed = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, status, priority, assignedTo } = req.body;

    const need = await FacilityNeed.findById(id);
    if (!need) {
      return res.status(404).json({ message: 'Facility need not found' });
    }

    // If new images uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.location);
      // Overwrite or push to existing array (decide your approach):
      need.images = newImages;
    }

    need.description = description ?? need.description;
    need.status = status ?? need.status;
    need.priority = priority ?? need.priority;
    need.assignedTo = assignedTo ?? need.assignedTo;

    const updatedNeed = await need.save();
    return res.json(updatedNeed);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/facility-needs/:id
 * Delete a facility need by ID.
 */
exports.deleteFacilityNeed = async (req, res) => {
  try {
    const { id } = req.params;
    const need = await FacilityNeed.findById(id);
    if (!need) {
      return res.status(404).json({ message: 'Facility need not found' });
    }
    await FacilityNeed.deleteOne({ _id: id });
    return res.json({ message: 'Facility need deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
