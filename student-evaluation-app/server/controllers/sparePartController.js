/**
 * @file sparePartController.js
 * @description CRUD operations for SparePart model,
 *              using AWS SDK v3 for optional image upload.
 */

const SparePart = require('../models/SparePart');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * GET /api/spare-parts
 * Retrieve all spare parts.
 */
exports.getAllSpareParts = async (req, res) => {
  try {
    const parts = await SparePart.find().sort({ createdAt: -1 });
    return res.json(parts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/spare-parts/:id
 * Retrieve a single spare part by ID.
 */
exports.getSparePartById = async (req, res) => {
  try {
    const part = await SparePart.findById(req.params.id);
    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }
    return res.json(part);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/spare-parts
 * Create a new spare part. If an image is uploaded, store it in S3 + CloudFront URL.
 */
exports.createSparePart = async (req, res) => {
  try {
    const {
      partName,
      partNumber,
      description,
      room,
      shelf,
      quantityOnHand,
      repairStatus,
      purchasePriority,
    } = req.body;

    let imageUrl = null;
    if (req.file) {
      const file = req.file;
      const uniqueKey = `spareparts/${Date.now()}-${file.originalname}`;

      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      imageUrl = `https://${cloudfrontDomain}/${uniqueKey}`;
    }

    const newPart = new SparePart({
      partName,
      partNumber,
      description,
      imageUrl,
      location: { room, shelf },
      quantityOnHand,
      repairStatus,
      purchasePriority,
    });

    const savedPart = await newPart.save();
    return res.status(201).json(savedPart);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/spare-parts/:id
 * Update a spare part, optionally with a new image.
 */
exports.updateSparePart = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      partName,
      partNumber,
      description,
      room,
      shelf,
      quantityOnHand,
      repairStatus,
      purchasePriority,
    } = req.body;

    const part = await SparePart.findById(id);
    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }

    if (req.file) {
      const file = req.file;
      const uniqueKey = `spareparts/${Date.now()}-${file.originalname}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      const cfDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      part.imageUrl = `https://${cfDomain}/${uniqueKey}`;
    }

    // Update fields
    part.partName = partName ?? part.partName;
    part.partNumber = partNumber ?? part.partNumber;
    part.description = description ?? part.description;
    part.location.room = room ?? part.location.room;
    part.location.shelf = shelf ?? part.location.shelf;
    part.quantityOnHand = quantityOnHand ?? part.quantityOnHand;
    part.repairStatus = repairStatus ?? part.repairStatus;
    part.purchasePriority = purchasePriority ?? part.purchasePriority;

    const updatedPart = await part.save();
    return res.json(updatedPart);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/spare-parts/:id
 * Delete a spare part.
 */
exports.deleteSparePart = async (req, res) => {
  try {
    const { id } = req.params;
    const part = await SparePart.findById(id);
    if (!part) {
      return res.status(404).json({ message: 'Spare part not found' });
    }
    await SparePart.deleteOne({ _id: id });
    return res.json({ message: 'Spare part deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
