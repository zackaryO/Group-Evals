/**
 * @file loanerToolboxController.js
 * @description CRUD operations for the LoanerToolbox model (loaner toolboxes),
 *              using AWS SDK v3 for image uploads (multiple drawer images).
 *              Only instructors should access these routes (enforced at route level).
 */

const LoanerToolbox = require('../models/LoanerToolbox');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Initialize the S3 client with your AWS credentials (no ACL usage).
 */
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * GET /api/loaner-toolboxes
 * Retrieve all loaner toolboxes (sorted by newest).
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
 * Retrieve a single loaner toolbox by its ID.
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
 * Create a new loaner toolbox.
 * - `toolboxName` (string)
 * - `tools` (JSON string or array) representing the tools in this toolbox
 * - multiple drawer images in req.files (memory-based Multer)
 */
exports.createLoanerToolbox = async (req, res) => {
  try {
    const { toolboxName, tools } = req.body;

    // Parse the `tools` array if provided as a JSON string
    let parsedTools = [];
    if (tools) {
      parsedTools = typeof tools === 'string' ? JSON.parse(tools) : tools;
    }

    // Handle multiple images for the drawer
    let drawerImages = [];
    if (req.files && req.files.length > 0) {
      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN; // e.g. "d12345abcd.cloudfront.net"

      // Upload each file to S3
      for (const file of req.files) {
        const uniqueKey = `loaner-drawers/${Date.now()}-${file.originalname}`;
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        // Construct the CloudFront-based URL
        drawerImages.push(`https://${cloudfrontDomain}/${uniqueKey}`);
      }
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
 * Update an existing loaner toolbox.
 * - optionally overwrite drawerImages if new images are uploaded
 * - update `tools` if provided
 */
exports.updateLoanerToolbox = async (req, res) => {
  try {
    const { id } = req.params;
    const { toolboxName, tools } = req.body;

    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Loaner toolbox not found' });
    }

    // Update the name if provided
    if (toolboxName !== undefined) {
      toolbox.toolboxName = toolboxName;
    }

    // If new images are uploaded, overwrite the existing drawerImages array
    if (req.files && req.files.length > 0) {
      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      let newDrawerImages = [];
      for (const file of req.files) {
        const uniqueKey = `loaner-drawers/${Date.now()}-${file.originalname}`;
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        newDrawerImages.push(`https://${cloudfrontDomain}/${uniqueKey}`);
      }
      toolbox.drawerImages = newDrawerImages; 
      // If you prefer to append instead of overwrite, you could push onto `toolbox.drawerImages`.
    }

    // If `tools` is provided, parse and assign
    if (tools) {
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
 * Remove the loaner toolbox by ID. (Optional: also remove images from S3.)
 */
exports.deleteLoanerToolbox = async (req, res) => {
  try {
    const { id } = req.params;
    const toolbox = await LoanerToolbox.findById(id);
    if (!toolbox) {
      return res.status(404).json({ message: 'Loaner toolbox not found' });
    }

    // If you want to delete the images from S3, parse the Key from each URL and use DeleteObjectCommand.
    // e.g. const s3Key = toolbox.drawerImages[i].split('.cloudfront.net/')[1];

    await LoanerToolbox.deleteOne({ _id: id });
    return res.json({ message: 'Loaner toolbox deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
