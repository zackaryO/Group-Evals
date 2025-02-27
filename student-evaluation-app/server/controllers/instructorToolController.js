/**
 * instructorToolController.js
 *
 * CRUD operations for InstructorTool model.
 * Only instructors should access these routes (enforced at the route level).
 */

const InstructorTool = require('../models/InstructorTool');

/**
 * GET /api/instructor-tools
 * Retrieve all instructor tools.
 * Optionally filter by instructor if needed.
 */
exports.getAllInstructorTools = async (req, res) => {
  try {
    // If you want only the tools owned by the currently logged-in instructor:
    // const instructorId = req.user.id; // if you store it in JWT
    // const tools = await InstructorTool.find({ instructor: instructorId });

    // Otherwise, get all:
    const tools = await InstructorTool.find().populate('instructor', 'username firstName lastName');
    return res.json(tools);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/instructor-tools/:id
 * Retrieve a single instructor tool by ID.
 */
exports.getInstructorToolById = async (req, res) => {
  try {
    const tool = await InstructorTool.findById(req.params.id).populate('instructor', 'username');
    if (!tool) {
      return res.status(404).json({ message: 'Instructor tool not found' });
    }
    return res.json(tool);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/instructor-tools
 * Create a new instructor tool.
 * The "instructor" field can be deduced from req.user if you like.
 */
exports.createInstructorTool = async (req, res) => {
  try {
    const { instructor, toolName, description } = req.body;

    let imageUrl = '';
    if (req.file && req.file.location) {
      imageUrl = req.file.location;
    }

    const newTool = new InstructorTool({
      instructor,
      toolName,
      imageUrl,
      description,
    });

    const savedTool = await newTool.save();
    return res.status(201).json(savedTool);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/instructor-tools/:id
 * Update an existing instructor tool.
 */
exports.updateInstructorTool = async (req, res) => {
  try {
    const { id } = req.params;
    const { instructor, toolName, description } = req.body;

    const tool = await InstructorTool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Instructor tool not found' });
    }

    // Update image if new file uploaded
    if (req.file && req.file.location) {
      tool.imageUrl = req.file.location;
    }

    // Update fields
    if (instructor !== undefined) {
      tool.instructor = instructor;
    }
    if (toolName !== undefined) {
      tool.toolName = toolName;
    }
    if (description !== undefined) {
      tool.description = description;
    }

    const updatedTool = await tool.save();
    return res.json(updatedTool);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/instructor-tools/:id
 * Delete an instructor tool by ID.
 */
exports.deleteInstructorTool = async (req, res) => {
  try {
    const { id } = req.params;
    const tool = await InstructorTool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Instructor tool not found' });
    }
    await InstructorTool.deleteOne({ _id: id });
    return res.json({ message: 'Instructor tool deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
