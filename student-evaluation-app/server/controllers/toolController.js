/**
 * @file toolController.js
 * @description Controller for handling Tool CRUD and image uploads with AWS SDK v3 + CloudFront domain.
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
 */
exports.createTool = async (req, res) => {
  try {
    const {
      name,
      partnum,
      description,
      quantityOnHand,
      room,
      shelf,
      repairStatus,
      purchasePriority,
    } = req.body;

    let imageUrl = null;
    if (req.file) {
      // The user uploaded a file
      const file = req.file;
      // Use a unique name for the S3 key
      const uniqueKey = `inventory/${Date.now()}-${file.originalname}`;

      // NOTE: No "ACL" property here, because your bucket is in "Bucket owner enforced" mode
      const putParams = {
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      // Upload to S3
      await s3.send(new PutObjectCommand(putParams));

      // Construct the URL using your CloudFront domain from .env
      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN; // e.g. "d12345abcd.cloudfront.net"
      imageUrl = `https://${cloudfrontDomain}/${uniqueKey}`;
    }

    const newTool = new Tool({
      name,
      partnum,
      description,
      quantityOnHand,
      location: { room, shelf },
      repairStatus,
      purchasePriority,
      imageUrl, // store the CloudFront-based URL
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
 * then store its CloudFront URL in "imageUrl".
 */
exports.updateTool = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      partnum,
      description,
      quantityOnHand,
      room,
      shelf,
      repairStatus,
      purchasePriority,
    } = req.body;

    const tool = await Tool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    if (req.file) {
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
      const newImageUrl = `https://${cloudfrontDomain}/${uniqueKey}`;
      console.log('AWS_S3_CUSTOM_DOMAIN:', process.env.AWS_S3_CUSTOM_DOMAIN); 
      // Overwrite the old image URL in the DB record
      tool.imageUrl = newImageUrl;

      // (Optional) If you want to remove the old S3 file, you'd call DeleteObjectCommand here
    }

    // Update other fields if changed
    if (name !== undefined) tool.name = name;
    if (partnum !== undefined) tool.partnum = partnum;
    if (description !== undefined) tool.description = description;
    if (quantityOnHand !== undefined) tool.quantityOnHand = quantityOnHand;
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
 * Delete a tool by ID (Optional: also delete its file from S3 if desired).
 */
exports.deleteTool = async (req, res) => {
  try {
    const { id } = req.params;
    const tool = await Tool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Tool not found' });
    }

    // (Optional) If you'd like to remove the old image from S3, parse the Key from tool.imageUrl
    //   e.g. const key = tool.imageUrl.split('.amazonaws.com/')[1];
    //   await s3.send(new DeleteObjectCommand({ Bucket, Key: key }));

    await Tool.deleteOne({ _id: id });
    res.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    console.error('[deleteTool] Error:', error);
    res.status(500).json({ message: 'Error deleting tool' });
  }
};
