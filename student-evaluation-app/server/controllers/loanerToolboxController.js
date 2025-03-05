/**
 * @file loanerToolboxController.js
 * @description Controller for LoanerToolbox model (many-to-many with Tool).
 *              Includes S3 file uploads for drawerImages, attach/detach Tools,
 *              getToolboxTools returning { inTools, outTools }, etc.
 *
 *              Now also includes deleteDrawerImage method:
 *              DELETE /api/loaner-toolboxes/:id/drawer-images 
 *              to remove a single image from the toolbox drawerImages array.
 */

const LoanerToolbox = require('../models/LoanerToolbox');
const Tool = require('../models/Tool');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

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

    // If images are uploaded, send each to S3
    let drawerImages = [];
    if (req.files && req.files.length > 0) {
      const cloudFrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      for (const file of req.files) {
        const uniqueKey = `loaner-drawers/${Date.now()}-${file.originalname}`;
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
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
 * Update toolboxName and optionally add new drawerImages.
 * We do NOT remove old images unless the user calls the single-delete route.
 */
exports.updateLoanerToolbox = async (req, res) => {
  try {
    const { id } = req.params;
    const { toolboxName } = req.body;

    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    if (toolboxName !== undefined) {
      toolbox.toolboxName = toolboxName;
    }

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
      // We append new images to existing. 
      // Single-image removal is done via the dedicated deleteDrawerImage method.
      toolbox.drawerImages = toolbox.drawerImages.concat(newDrawerImages);
    }

    const updated = await toolbox.save();
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/loaner-toolboxes/:id
 * Remove the entire toolbox. Also remove references to it in Tools.
 */
exports.deleteLoanerToolbox = async (req, res) => {
  try {
    const { id } = req.params;
    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    // Remove from each Tool's loanerToolboxes
    await Tool.updateMany(
      { _id: { $in: toolbox.tools } },
      { $pull: { loanerToolboxes: toolbox._id } }
    );

    // Optionally remove images from S3 (commented out here)
    for (const imageUrl of toolbox.drawerImages) {
      const key = parseKeyFromUrl(imageUrl);
      if (key) {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
          Key: key
        }));
      }
    }

    await LoanerToolbox.deleteOne({ _id: id });
    return res.json({ message: 'Loaner toolbox deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/loaner-toolboxes/:id/drawer-images
 * Remove a single image from the toolbox's drawerImages array.
 * 
 * Expects { imageUrl } in the request body (in the DELETE's data).
 * 
 * Optionally deletes from S3 if desired (some code is commented out).
 */
exports.deleteDrawerImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body; // or req.query, but here we use body

    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' });
    }

    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    // Filter out that image from drawerImages
    const beforeCount = toolbox.drawerImages.length;
    toolbox.drawerImages = toolbox.drawerImages.filter(img => img !== imageUrl);
    const afterCount = toolbox.drawerImages.length;

    if (afterCount === beforeCount) {
      return res.status(404).json({ message: 'Image URL not found in this toolbox.' });
    }

    // Optionally remove from S3:
    let key = parseKeyFromUrl(imageUrl);
    if (key) {
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: key,
      }));
    }

    await toolbox.save();
    return res.json({ message: 'Drawer image removed successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * Helper function to parse the S3 key from a URL, if needed.
 * E.g. "https://cloudfront.net/loaner-drawers/1678123456-something.jpg"
 * returns "loaner-drawers/1678123456-something.jpg"
 * 
 * @param {string} url 
 * @returns {string|null} The parsed key or null
 */
function parseKeyFromUrl(url) {
  try {
    const splitAmazon = url.split('.amazonaws.com/');
    if (splitAmazon.length === 2) return splitAmazon[1];
    const splitCloudfront = url.split('.cloudfront.net/');
    if (splitCloudfront.length === 2) return splitCloudfront[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * POST /api/loaner-toolboxes/:id/attach-tool
 * Attach a tool to the toolbox if not present.
 */
exports.attachTool = async (req, res) => {
  try {
    const { id } = req.params;
    const { toolId } = req.body;

    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    if (!toolbox.tools.includes(toolId)) {
      toolbox.tools.push(toolId);
      await toolbox.save();
    }
    if (!tool.loanerToolboxes.includes(id)) {
      tool.loanerToolboxes.push(id);
      await tool.save();
    }

    return res.json({ message: 'Tool attached successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * POST /api/loaner-toolboxes/:id/detach-tool
 * Detach a tool from the toolbox (remove from each side).
 */
exports.detachTool = async (req, res) => {
  try {
    const { id } = req.params;
    const { toolId } = req.body;

    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Toolbox not found' });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    toolbox.tools = toolbox.tools.filter(t => t.toString() !== toolId.toString());
    await toolbox.save();

    tool.loanerToolboxes = tool.loanerToolboxes.filter(tb => tb.toString() !== id.toString());
    await tool.save();

    return res.json({ message: 'Tool detached successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
