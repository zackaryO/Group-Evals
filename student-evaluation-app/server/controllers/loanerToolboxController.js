/**
 * loanerToolboxController.js
 *
 * CRUD operations for LoanerToolbox model.
 * Only instructors should access these routes (enforced at the route level).
 */

const LoanerToolbox = require('../models/LoanerToolbox');

/**
 * GET /api/loaner-toolboxes
 * Retrieve all loaner toolboxes.
 */
exports.getAllLoanerToolboxes = async (req, res) => {
  try {
    const toolboxes = await LoanerToolbox.find().sort({ createdAt: -1 });
    return res.json(toolboxes);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/loaner-toolboxes/:id
 * Retrieve a single loaner toolbox by ID.
 */
exports.getLoanerToolboxById = async (req, res) => {
  try {
    const toolbox = await LoanerToolbox.findById(req.params.id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Loaner toolbox not found' });
    }
    return res.json(toolbox);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/loaner-toolboxes
 * Create a new loaner toolbox with optional drawer images.
 */
exports.createLoanerToolbox = async (req, res) => {
  try {
    const { toolboxName, tools } = req.body;

    // If multiple images were uploaded for drawers:
    let drawerImages = [];
    if (req.files && req.files.length > 0) {
      drawerImages = req.files.map((file) => file.location);
    }

    // Parse the tools if needed (if sent as JSON string)
    let parsedTools = [];
    if (tools) {
      parsedTools = typeof tools === 'string' ? JSON.parse(tools) : tools;
    }

    const newToolbox = new LoanerToolbox({
      toolboxName,
      drawerImages,
      tools: parsedTools,
    });

    const savedToolbox = await newToolbox.save();
    return res.status(201).json(savedToolbox);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/loaner-toolboxes/:id
 * Update an existing loaner toolbox (can update drawer images, tools, etc.).
 */
exports.updateLoanerToolbox = async (req, res) => {
  try {
    const { id } = req.params;
    const { toolboxName, tools } = req.body;

    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Loaner toolbox not found' });
    }

    if (toolboxName !== undefined) {
      toolbox.toolboxName = toolboxName;
    }

    // If new images are uploaded, replace or append
    if (req.files && req.files.length > 0) {
      const newDrawerImages = req.files.map((file) => file.location);
      // Decide if you want to overwrite or append
      // Overwrite:
      toolbox.drawerImages = newDrawerImages;
    }

    if (tools) {
      // tools might be a JSON string
      const parsedTools = typeof tools === 'string' ? JSON.parse(tools) : tools;
      toolbox.tools = parsedTools;
    }

    const updatedToolbox = await toolbox.save();
    return res.json(updatedToolbox);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/loaner-toolboxes/:id
 * Delete a loaner toolbox by ID.
 */
exports.deleteLoanerToolbox = async (req, res) => {
  try {
    const { id } = req.params;
    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Loaner toolbox not found' });
    }
    await LoanerToolbox.deleteOne({ _id: id });
    return res.json({ message: 'Loaner toolbox deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
