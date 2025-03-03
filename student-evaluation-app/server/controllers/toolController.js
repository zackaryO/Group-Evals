/**
 * @file toolController.js
 * @description Controller methods for handling Tool CRUD operations.
 *              Integrates with "multer-s3" for image uploads.
 */

const Tool = require('../models/Tool');

/**
 * @function getAllTools
 * @description Fetches and returns all tools, sorted by creation date (descending).
 * @route GET /api/tools
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
 * @function getToolById
 * @description Fetches a single Tool by its MongoDB _id.
 * @route GET /api/tools/:id
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
 * @function createTool
 * @description Creates a new Tool document in MongoDB.
 *              If an image was uploaded, stores the S3 URL in tool.imageUrl.
 * @route POST /api/tools
 */
exports.createTool = async (req, res) => {
  try {
    const {
      name,
      description,
      quantityOnHand,
      room,
      shelf,
      repairStatus,
      purchasePriority
    } = req.body;
    
    // If multer-s3 uploaded a file, req.file.location is the S3 URL
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
 * @function updateTool
 * @description Updates an existing Tool in MongoDB by _id. Replaces the tool's imageUrl if a new image is uploaded.
 * @route PUT /api/tools/:id
 */
exports.updateTool = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      quantityOnHand,
      room,
      shelf,
      repairStatus,
      purchasePriority
    } = req.body;

    const tool = await Tool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    // If an image is uploaded, overwrite the old imageUrl
    if (req.file && req.file.location) {
      tool.imageUrl = req.file.location;
    }

    // Update other fields if provided
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
 * @function deleteTool
 * @description Deletes an existing Tool by _id.
 * @route DELETE /api/tools/:id
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
