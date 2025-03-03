/**
 * @file instructorToolController.js
 * @description CRUD for InstructorTool model, AWS v3 S3 if image is uploaded.
 */

const InstructorTool = require('../models/InstructorTool');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * GET /api/instructor-tools
 */
exports.getAllInstructorTools = async (req, res) => {
  try {
    const tools = await InstructorTool.find()
      .populate('instructor', 'username firstName lastName')
      .sort({ createdAt: -1 });
    res.json(tools);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/instructor-tools/:id
 */
exports.getInstructorToolById = async (req, res) => {
  try {
    const tool = await InstructorTool.findById(req.params.id)
      .populate('instructor', 'username firstName lastName');
    if (!tool) {
      return res.status(404).json({ message: 'Instructor tool not found' });
    }
    res.json(tool);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/instructor-tools
 */
exports.createInstructorTool = async (req, res) => {
  try {
    const { instructor, toolName, description } = req.body;

    let imageUrl = null;
    if (req.file) {
      const file = req.file;
      const uniqueKey = `instr-tools/${Date.now()}-${file.originalname}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      const cfDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      imageUrl = `https://${cfDomain}/${uniqueKey}`;
    }

    const newTool = new InstructorTool({
      instructor,
      toolName,
      imageUrl,
      description,
    });

    const savedTool = await newTool.save();
    res.status(201).json(savedTool);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/instructor-tools/:id
 */
exports.updateInstructorTool = async (req, res) => {
  try {
    const { id } = req.params;
    const { instructor, toolName, description } = req.body;

    const tool = await InstructorTool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Instructor tool not found' });
    }

    if (req.file) {
      const file = req.file;
      const uniqueKey = `instr-tools/${Date.now()}-${file.originalname}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      const cfDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      tool.imageUrl = `https://${cfDomain}/${uniqueKey}`;
    }

    if (instructor !== undefined) tool.instructor = instructor;
    if (toolName !== undefined) tool.toolName = toolName;
    if (description !== undefined) tool.description = description;

    const updatedTool = await tool.save();
    res.json(updatedTool);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/instructor-tools/:id
 */
exports.deleteInstructorTool = async (req, res) => {
  try {
    const { id } = req.params;
    const tool = await InstructorTool.findById(id);
    if (!tool) {
      return res.status(404).json({ message: 'Instructor tool not found' });
    }
    await InstructorTool.deleteOne({ _id: id });
    res.json({ message: 'Instructor tool deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
