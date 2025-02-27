/**
 * consumableController.js
 *
 * CRUD operations for Consumable model.
 * Only instructors should access these routes (enforced at the route level).
 */

const Consumable = require('../models/Consumable');

/**
 * GET /api/consumables
 * Retrieve all consumables.
 */
exports.getAllConsumables = async (req, res) => {
  try {
    const consumables = await Consumable.find().sort({ createdAt: -1 });
    return res.json(consumables);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/consumables/:id
 * Retrieve a single consumable by ID.
 */
exports.getConsumableById = async (req, res) => {
  try {
    const item = await Consumable.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Consumable not found' });
    }
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/consumables
 * Create a new consumable.
 */
exports.createConsumable = async (req, res) => {
  try {
    const { name, room, shelf, quantityOnHand, desiredQuantity } = req.body;

    let imageUrl = '';
    if (req.file && req.file.location) {
      imageUrl = req.file.location;
    }

    const newConsumable = new Consumable({
      name,
      imageUrl,
      location: { room, shelf },
      quantityOnHand,
      desiredQuantity,
    });

    const savedConsumable = await newConsumable.save();
    return res.status(201).json(savedConsumable);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/consumables/:id
 * Update an existing consumable.
 */
exports.updateConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, room, shelf, quantityOnHand, desiredQuantity } = req.body;

    const item = await Consumable.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Consumable not found' });
    }

    if (req.file && req.file.location) {
      item.imageUrl = req.file.location;
    }

    item.name = name ?? item.name;
    item.location.room = room ?? item.location.room;
    item.location.shelf = shelf ?? item.location.shelf;
    item.quantityOnHand = quantityOnHand ?? item.quantityOnHand;
    item.desiredQuantity = desiredQuantity ?? item.desiredQuantity;

    const updatedItem = await item.save();
    return res.json(updatedItem);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/consumables/:id
 * Delete a consumable by ID.
 */
exports.deleteConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Consumable.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Consumable not found' });
    }
    await Consumable.deleteOne({ _id: id });
    return res.json({ message: 'Consumable deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
