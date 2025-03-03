/**
 * @file trainingVehicleController.js
 * @description CRUD operations for TrainingVehicle model. 
 *              No file uploads here (by default), but fully supports phone-friendly front-end.
 */

const TrainingVehicle = require('../models/TrainingVehicle');

/**
 * GET /api/training-vehicles
 * Retrieve all training vehicles.
 */
exports.getAllTrainingVehicles = async (req, res) => {
  try {
    const vehicles = await TrainingVehicle.find().sort({ createdAt: -1 });
    return res.json(vehicles);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/training-vehicles/:id
 * Retrieve a single training vehicle by ID.
 */
exports.getTrainingVehicleById = async (req, res) => {
  try {
    const vehicle = await TrainingVehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Training vehicle not found' });
    }
    return res.json(vehicle);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/training-vehicles
 * Create a new training vehicle (no images by default).
 */
exports.createTrainingVehicle = async (req, res) => {
  try {
    const {
      year,
      make,
      model,
      vin,
      roNumber,
      engineCode,
      transmissionCode,
      mileage,
      baumuster,
      repairsNeeded,
      partsNeeded,
    } = req.body;

    const newVehicle = new TrainingVehicle({
      year,
      make,
      model,
      vin,
      roNumber,
      engineCode,
      transmissionCode,
      mileage,
      baumuster,
      repairsNeeded,
      partsNeeded,
    });

    const savedVehicle = await newVehicle.save();
    return res.status(201).json(savedVehicle);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * PUT /api/training-vehicles/:id
 * Update an existing training vehicle.
 */
exports.updateTrainingVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      year,
      make,
      model,
      vin,
      roNumber,
      engineCode,
      transmissionCode,
      mileage,
      baumuster,
      repairsNeeded,
      partsNeeded,
    } = req.body;

    const vehicle = await TrainingVehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Training vehicle not found' });
    }

    // Update fields if provided
    vehicle.year = year ?? vehicle.year;
    vehicle.make = make ?? vehicle.make;
    vehicle.model = model ?? vehicle.model;
    vehicle.vin = vin ?? vehicle.vin;
    vehicle.roNumber = roNumber ?? vehicle.roNumber;
    vehicle.engineCode = engineCode ?? vehicle.engineCode;
    vehicle.transmissionCode = transmissionCode ?? vehicle.transmissionCode;
    vehicle.mileage = mileage ?? vehicle.mileage;
    vehicle.baumuster = baumuster ?? vehicle.baumuster;
    vehicle.repairsNeeded = repairsNeeded ?? vehicle.repairsNeeded;
    vehicle.partsNeeded = partsNeeded ?? vehicle.partsNeeded;

    const updatedVehicle = await vehicle.save();
    return res.json(updatedVehicle);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * DELETE /api/training-vehicles/:id
 * Delete a training vehicle by ID.
 */
exports.deleteTrainingVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await TrainingVehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Training vehicle not found' });
    }
    await TrainingVehicle.deleteOne({ _id: id });
    return res.json({ message: 'Training vehicle deleted successfully' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
