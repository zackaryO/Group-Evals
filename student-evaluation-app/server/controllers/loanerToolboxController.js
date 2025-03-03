/**
 * @file loanerToolboxController.js
 * @description Controller for LoanerToolbox model (many-to-many with Tool).
 *              Includes S3 file uploads for drawerImages, attach/detach Tools,
 *              getToolboxTools returning { inTools, outTools }, etc.
 */

const LoanerToolbox = require('../models/LoanerToolbox');
const Tool = require('../models/Tool');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3 client (memory-based multer is used in middleware)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * GET /api/loaner-toolboxes
 * Return a list of all LoanerToolboxes (basic data).
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
 * Return a single toolbox by ID (can populate 'tools' if needed).
 */
exports.getLoanerToolboxById = async (req, res) => {
  try {
    const toolbox = await LoanerToolbox.findById(req.params.id).populate('tools');
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }
    return res.json(toolbox);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/loaner-toolboxes/:id/tools
 * Return { inTools: [...], outTools: [...] } for the specified toolbox.
 * 'inTools' = tools that are in toolbox.tools
 * 'outTools' = the rest of the tools
 */
exports.getToolboxTools = async (req, res) => {
  try {
    const toolboxId = req.params.id;
    const toolbox = await LoanerToolbox.findById(toolboxId);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    // Tools in the toolbox
    const inTools = await Tool.find({ _id: { $in: toolbox.tools } });
    // Tools not in the toolbox
    const outTools = await Tool.find({ _id: { $nin: toolbox.tools } });

    res.json({ inTools, outTools });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/loaner-toolboxes
 * Create a new toolbox with optional drawerImages (uploaded to S3).
 */
exports.createLoanerToolbox = async (req, res) => {
  try {
    const { toolboxName } = req.body;
    if (!toolboxName) {
      return res.status(400).json({ message: 'toolboxName is required' });
    }

    // If any images are uploaded in memory, we upload each to S3
    let drawerImages = [];
    if (req.files && req.files.length > 0) {
      // Use your custom domain from environment
      const cloudFrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN; 
      for (const file of req.files) {
        // Construct a unique key
        const uniqueKey = `loaner-drawers/${Date.now()}-${file.originalname}`;
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));

        // Build the CloudFront-based URL
        drawerImages.push(`https://${cloudFrontDomain}/${uniqueKey}`);
      }
    }

    const newToolbox = new LoanerToolbox({
      toolboxName,
      drawerImages,
      tools: [], // no tools by default
    });

    const saved = await newToolbox.save();
    return res.status(201).json(saved);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/loaner-toolboxes/:id
 * Update toolboxName and optionally replace drawerImages with new uploads.
 */
exports.updateLoanerToolbox = async (req, res) => {
  try {
    const { id } = req.params;
    const { toolboxName } = req.body; // any other fields?

    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    if (toolboxName !== undefined) {
      toolbox.toolboxName = toolboxName;
    }

    // If new images are uploaded, overwrite existing drawerImages
    if (req.files && req.files.length > 0) {
      const cloudFrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      let newDrawerImages = [];
      for (const file of req.files) {
        const uniqueKey = `loaner-drawers/${Date.now()}-${file.originalname}`;
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        newDrawerImages.push(`https://${cloudFrontDomain}/${uniqueKey}`);
      }
      toolbox.drawerImages = newDrawerImages;
    }

    const updated = await toolbox.save();
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/loaner-toolboxes/:id
 * Remove the toolbox. Also remove references to it from Tools.
 */
exports.deleteLoanerToolbox = async (req, res) => {
  try {
    const { id } = req.params;
    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    // Remove the toolbox from each Tool's loanerToolboxes array
    await Tool.updateMany(
      { _id: { $in: toolbox.tools } },
      { $pull: { loanerToolboxes: toolbox._id } }
    );

    // Optionally, if you want to remove images from S3, parse the Key from each URL
    // for (const imageUrl of toolbox.drawerImages) {
    //   const s3Key = imageUrl.split('.amazonaws.com/')[1] || imageUrl.split('.cloudfront.net/')[1];
    //   if (s3Key) {
    //     await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_STORAGE_BUCKET_NAME, Key: s3Key }));
    //   }
    // }

    // Now delete the toolbox itself
    await LoanerToolbox.deleteOne({ _id: id });
    return res.json({ message: 'Loaner toolbox deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * POST /api/loaner-toolboxes/:id/attach-tool
 * Add a tool reference to the toolbox (and vice versa) if not already present.
 */
exports.attachTool = async (req, res) => {
  try {
    const toolboxId = req.params.id;
    const { toolId } = req.body;

    const toolbox = await LoanerToolbox.findById(toolboxId);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    // Add if not present
    if (!toolbox.tools.includes(toolId)) {
      toolbox.tools.push(toolId);
      await toolbox.save();
    }
    if (!tool.loanerToolboxes.includes(toolboxId)) {
      tool.loanerToolboxes.push(toolboxId);
      await tool.save();
    }

    res.json({ message: 'Tool attached successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * POST /api/loaner-toolboxes/:id/detach-tool
 * Remove a tool from the toolbox (and remove the toolbox from the tool).
 */
exports.detachTool = async (req, res) => {
  try {
    const toolboxId = req.params.id;
    const { toolId } = req.body;

    const toolbox = await LoanerToolbox.findById(toolboxId);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    // Remove the tool from toolbox's array
    toolbox.tools = toolbox.tools.filter(
      (tid) => tid.toString() !== tool._id.toString()
    );
    await toolbox.save();

    // Remove the toolbox from tool's loanerToolboxes
    tool.loanerToolboxes = tool.loanerToolboxes.filter(
      (tbid) => tbid.toString() !== toolbox._id.toString()
    );
    await tool.save();

    res.json({ message: 'Tool detached successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
