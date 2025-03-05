/**
 * @file toolController.js
 * @description Controller for handling Tool CRUD and image uploads with AWS SDK v3 + CloudFront domain.
 *              Now also supports an "expectedQuantity" field so we can track "missing" tools.
 */

const Tool = require('../models/Tool');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize the S3 client (no ACL usage).
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

exports.getAllTools = async (req, res) => {
  try {
    const tools = await Tool.find().sort({ createdAt: -1 });
    res.json(tools);
  } catch (error) {
    console.error('[getAllTools] Error:', error);
    res.status(500).json({ message: 'Error fetching tools' });
  }
};

exports.getToolById = async (req, res) => {
  try {
    const tool = await Tool.findById(req.params.id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }
    res.json(tool);
  } catch (error) {
    console.error('[getToolById] Error:', error);
    res.status(500).json({ message: 'Error fetching tool' });
  }
};

/**
 * Create a new tool, optionally uploading an image to S3.
 * The final public URL will be served from CloudFront (AWS_S3_CUSTOM_DOMAIN).
 * Also includes "expectedQuantity" for tracking missing items.
 */
exports.createTool = async (req, res) => {
  try {
    const {
      name,
      partnum,
      description,
      quantityOnHand,
      expectedQuantity,      // <--- new for missing-tracking
      room,
      shelf,
      repairStatus,
      purchasePriority,
    } = req.body;

    let imageUrl = null;
    if (req.file) {
      // The user uploaded a file
      const file = req.file;
      const uniqueKey = `inventory/${Date.now()}-${file.originalname}`;

      const putParams = {
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      await s3.send(new PutObjectCommand(putParams));

      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN; 
      imageUrl = `https://${cloudfrontDomain}/${uniqueKey}`;
    }

    const newTool = new Tool({
      name,
      partnum,
      description,
      quantityOnHand,
      expectedQuantity,    // <--- stored in DB
      location: { room, shelf },
      repairStatus,
      purchasePriority,
      imageUrl,
    });

    const savedTool = await newTool.save();
    return res.status(201).json(savedTool);
  } catch (error) {
    console.error('[createTool] Error:', error);
    res.status(500).json({ message: 'Error creating tool' });
  }
};

/**
 * Update an existing tool. If an image is uploaded, we upload it to S3,
 * then store its CloudFront URL in "imageUrl". Also includes expectedQuantity.
 */
exports.updateTool = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      partnum,
      description,
      quantityOnHand,
      expectedQuantity,    // <--- for missing tracking
      room,
      shelf,
      repairStatus,
      purchasePriority,
    } = req.body;

    const tool = await Tool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    // Handle optional image upload
    if (req.file) {
      const file = req.file;
      const uniqueKey = `inventory/${Date.now()}-${file.originalname}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      tool.imageUrl = `https://${cloudfrontDomain}/${uniqueKey}`;
    }

    if (name !== undefined) tool.name = name;
    if (partnum !== undefined) tool.partnum = partnum;
    if (description !== undefined) tool.description = description;
    if (quantityOnHand !== undefined) tool.quantityOnHand = quantityOnHand;
    if (expectedQuantity !== undefined) tool.expectedQuantity = expectedQuantity; // <--- store
    if (room !== undefined) tool.location.room = room;
    if (shelf !== undefined) tool.location.shelf = shelf;
    if (repairStatus !== undefined) tool.repairStatus = repairStatus;
    if (purchasePriority !== undefined) tool.purchasePriority = purchasePriority;

    const updatedTool = await tool.save();
    res.json(updatedTool);
  } catch (error) {
    console.error('[updateTool] Error:', error);
    res.status(500).json({ message: 'Error updating tool' });
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

    // (Optional) remove from S3 as well if you want
    // parseKeyFromUrl(tool.imageUrl)...

    await Tool.deleteOne({ _id: id });
    res.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    console.error('[deleteTool] Error:', error);
    res.status(500).json({ message: 'Error deleting tool' });
  }
};
