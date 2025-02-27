/**
 * sparePartController.js
 *
 * CRUD operations for SparePart model.
 * Only instructors should access these routes (enforced at the route level).
 */

const SparePart = require('../models/SparePart');

/**
 * GET /api/spare-parts
 * Retrieve all spare parts.
 */
exports.getAllSpareParts = async (req, res) => {
  try {
    const parts = await SparePart.find().sort({ createdAt: -1 });
    return res.json(parts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/spare-parts/:id
 * Retrieve a single spare part by ID.
 */
exports.getSparePartById = async (req, res) => {
  try {
    const part = await SparePart.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }
    return res.json(part);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/spare-parts
 * Create a new spare part.
 * Can include image in req.file (S3).
 */
exports.createSparePart = async (req, res) => {
  try {
    const {
      partName,
      partNumber,
      description,
      room,
      shelf,
      quantityOnHand,
      repairStatus,
      purchasePriority,
    } = req.body;

    let imageUrl = '';
    if (req.file && req.file.location) {
      imageUrl = req.file.location;
    }

    const newPart = new SparePart({
      partName,
      partNumber,
      description,
      imageUrl,
      location: { room, shelf },
      quantityOnHand,
      repairStatus,
      purchasePriority,
    });

    const savedPart = await newPart.save();
    return res.status(201).json(savedPart);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/spare-parts/:id
 * Update an existing spare part.
 */
exports.updateSparePart = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      partName,
      partNumber,
      description,
      room,
      shelf,
      quantityOnHand,
      repairStatus,
      purchasePriority,
    } = req.body;

    const part = await SparePart.findById(id);
    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    // Update image if new file uploaded
    if (req.file && req.file.location) {
      part.imageUrl = req.file.location;
    }

    // Update fields if provided
    part.partName = partName ?? part.partName;
    part.partNumber = partNumber ?? part.partNumber;
    part.description = description ?? part.description;
    part.location.room = room ?? part.location.room;
    part.location.shelf = shelf ?? part.location.shelf;
    part.quantityOnHand = quantityOnHand ?? part.quantityOnHand;
    part.repairStatus = repairStatus ?? part.repairStatus;
    part.purchasePriority = purchasePriority ?? part.purchasePriority;

    const updatedPart = await part.save();
    return res.json(updatedPart);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/spare-parts/:id
 * Delete a spare part by ID.
 */
exports.deleteSparePart = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await SparePart.findById(id);
    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }
    await SparePart.deleteOne({ _id: id });
    return res.json({ message: 'Spare part deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
