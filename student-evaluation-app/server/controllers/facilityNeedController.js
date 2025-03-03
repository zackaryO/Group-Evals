/**
 * @file facilityNeedController.js
 * @description CRUD for FacilityNeed model, using AWS SDK v3 if images are uploaded.
 */

const FacilityNeed = require('../models/FacilityNeed');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Initialize S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * GET /api/facility-needs
 */
exports.getAllFacilityNeeds = async (req, res) => {
  try {
    const needs = await FacilityNeed.find().sort({ createdAt: -1 });
    res.json(needs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/facility-needs/:id
 */
exports.getFacilityNeedById = async (req, res) => {
  try {
    const need = await FacilityNeed.findById(req.params.id);
    if (!need) return res.status(404).json({ message: 'Facility need not found' });
    res.json(need);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/facility-needs
 * Allows multiple images. We'll build a CloudFront URL for each.
 */
exports.createFacilityNeed = async (req, res) => {
  try {
    const { description, status, priority, assignedTo } = req.body;

    // For multiple images
    let images = [];
    if (req.files && req.files.length > 0) {
      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      for (const file of req.files) {
        const uniqueKey = `facility/${Date.now()}-${file.originalname}`;
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        images.push(`https://${cloudfrontDomain}/${uniqueKey}`);
      }
    }

    const newNeed = new FacilityNeed({
      description,
      status,
      priority,
      assignedTo,
      images,
    });

    const savedNeed = await newNeed.save();
    res.status(201).json(savedNeed);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/facility-needs/:id
 */
exports.updateFacilityNeed = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, status, priority, assignedTo } = req.body;

    const need = await FacilityNeed.findById(id);
    if (!need) {
      return res.status(404).json({ message: 'Facility need not found' });
    }

    // If new images come in
    if (req.files && req.files.length > 0) {
      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      let newImages = [];
      for (const file of req.files) {
        const uniqueKey = `facility/${Date.now()}-${file.originalname}`;
        await s3.send(new PutObjectCommand({
          Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }));
        newImages.push(`https://${cloudfrontDomain}/${uniqueKey}`);
      }
      need.images = newImages;
    }

    need.description = description ?? need.description;
    need.status = status ?? need.status;
    need.priority = priority ?? need.priority;
    need.assignedTo = assignedTo ?? need.assignedTo;

    const updatedNeed = await need.save();
    res.json(updatedNeed);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/facility-needs/:id
 */
exports.deleteFacilityNeed = async (req, res) => {
  try {
    const { id } = req.params;
    const need = await FacilityNeed.findById(id);
    if (!need) {
      return res.status(404).json({ message: 'Facility need not found' });
    }
    await FacilityNeed.deleteOne({ _id: id });
    res.json({ message: 'Facility need deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
