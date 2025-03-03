/**
 * @file consumableController.js
 * @description CRUD for Consumable model, using AWS SDK v3 to upload a single image to S3 (like Tools).
 */

const Consumable = require('../models/Consumable');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Initialize AWS S3 client (like Tools).
 */
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * GET /api/consumables
 * Retrieve all consumables.
 */
exports.getAllConsumables = async (req, res) => {
  try {
    const consumables = await Consumable.find().sort({ createdAt: -1 });
    return res.json(consumables);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/consumables/:id
 * Retrieve one consumable by ID.
 */
exports.getConsumableById = async (req, res) => {
  try {
    const item = await Consumable.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Consumable not found' });
    }
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/consumables
 * Create a new consumable. If an image is uploaded, store it in S3.
 */
exports.createConsumable = async (req, res) => {
  try {
    const { name, room, shelf, quantityOnHand, desiredQuantity } = req.body;

    let imageUrl = null;
    if (req.file) {
      const file = req.file;
      const uniqueKey = `consumables/${Date.now()}-${file.originalname}`;

      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN; 
      imageUrl = `https://${cloudfrontDomain}/${uniqueKey}`;
    }

    const newConsumable = new Consumable({
      name,
      imageUrl,
      location: { room, shelf },
      quantityOnHand,
      desiredQuantity,
    });

    const savedItem = await newConsumable.save();
    return res.status(201).json(savedItem);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/consumables/:id
 * Update a consumable. If a new image is uploaded, replace the old imageUrl with the new S3 URL.
 */
exports.updateConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, room, shelf, quantityOnHand, desiredQuantity } = req.body;

    const item = await Consumable.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Consumable not found' });
    }

    if (req.file) {
      const file = req.file;
      const uniqueKey = `consumables/${Date.now()}-${file.originalname}`;

      await s3.send(new PutObjectCommand({
        Bucket: process.env.AWS_STORAGE_BUCKET_NAME,
        Key: uniqueKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      const cloudfrontDomain = process.env.AWS_S3_CUSTOM_DOMAIN;
      item.imageUrl = `https://${cloudfrontDomain}/${uniqueKey}`;
    }

    item.name = name ?? item.name;
    item.location.room = room ?? item.location.room;
    item.location.shelf = shelf ?? item.location.shelf;
    item.quantityOnHand = quantityOnHand ?? item.quantityOnHand;
    item.desiredQuantity = desiredQuantity ?? item.desiredQuantity;

    const updatedItem = await item.save();
    return res.json(updatedItem);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/consumables/:id
 * Remove a consumable from the DB. (Optional: delete old S3 object.)
 */
exports.deleteConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Consumable.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Consumable not found' });
    }
    await Consumable.deleteOne({ _id: id });
    return res.json({ message: 'Consumable deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
