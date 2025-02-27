/**
 * toolController.js
 * Contains all CRUD operations for Tools (Tool model).
 */

const Tool = require('../models/Tool');

/**
 * Get all tools.
 * Only instructors can access this route.
 */
exports.getAllTools = async (req, res) => {
  try {
    const tools = await Tool.find().sort({ createdAt: -1 });
    return res.json(tools);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Get a single tool by ID.
 */
exports.getToolById = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }
    return res.json(tool);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Create a new tool.
 * If an image was uploaded, its S3 URL is stored in tool.imageUrl.
 */
exports.createTool = async (req, res) => {
  try {
    const { name, description, quantityOnHand, room, shelf, repairStatus, purchasePriority } = req.body;
    
    // If an image was uploaded, multer-s3 places the file info in req.file
    let imageUrl = '';
    if (req.file && req.file.location) {
      imageUrl = req.file.location;
    }

    const newTool = new Tool({
      name,
      description,
      quantityOnHand,
      location: { room, shelf },
      repairStatus,
      purchasePriority,
      imageUrl,
    });

    const savedTool = await newTool.save();
    return res.status(201).json(savedTool);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * Update an existing tool.
 * If an image is uploaded, replace the existing imageUrl.
 */
exports.updateTool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, quantityOnHand, room, shelf, repairStatus, purchasePriority } = req.body;

    const tool = await Tool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    if (req.file && req.file.location) {
      tool.imageUrl = req.file.location;
    }

    // Update fields if provided
    tool.name = name ?? tool.name;
    tool.description = description ?? tool.description;
    tool.quantityOnHand = quantityOnHand ?? tool.quantityOnHand;
    tool.location.room = room ?? tool.location.room;
    tool.location.shelf = shelf ?? tool.location.shelf;
    tool.repairStatus = repairStatus ?? tool.repairStatus;
    tool.purchasePriority = purchasePriority ?? tool.purchasePriority;

    const updatedTool = await tool.save();
    return res.json(updatedTool);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * Delete a tool by ID.
 */
exports.deleteTool = async (req, res) => {
  try {
    const { id } = req.params;
    const tool = await Tool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }
    await Tool.deleteOne({ _id: id });
    return res.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
