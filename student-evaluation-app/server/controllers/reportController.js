/**
 * reportController.js
 * Generates PDF reports for each inventory category using pdfkit.
 */

const PDFDocument = require('pdfkit');
const Tool = require('../models/Tool');
const SparePart = require('../models/SparePart');
const Consumable = require('../models/Consumable');
const TrainingVehicle = require('../models/TrainingVehicle');
// ... import other models as needed (LoanerToolbox, etc.)

/**
 * Example: Generate a PDF of all Tools needing purchase or repair.
 */
exports.generateToolsReport = async (req, res) => {
  try {
    const doc = new PDFDocument({ bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tools_report.pdf');

    doc.text('Tools Report', { align: 'center', underline: true });
    doc.moveDown(2);

    const tools = await Tool.find();
    tools.forEach((tool) => {
      doc.fontSize(12).text(`Name: ${tool.name}`);
      doc.text(`Quantity: ${tool.quantityOnHand}`);
      doc.text(`Repair Status: ${tool.repairStatus}`);
      doc.text(`Purchase Priority: ${tool.purchasePriority}`);
      doc.text(`Location: ${tool.location.room} - ${tool.location.shelf}`);
      doc.moveDown();
    });

    doc.end();
    doc.pipe(res);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Example: Generate a PDF of Consumables needing reorder (quantity < desiredQuantity).
 */
exports.generateConsumablesReport = async (req, res) => {
  try {
    const doc = new PDFDocument({ bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=consumables_report.pdf');

    doc.text('Consumables Low-Stock Report', { align: 'center', underline: true });
    doc.moveDown(2);

    const consumables = await Consumable.find();
    const lowStock = consumables.filter(c => c.quantityOnHand < c.desiredQuantity);

    lowStock.forEach((c) => {
      doc.fontSize(12).text(`Name: ${c.name}`);
      doc.text(`On Hand: ${c.quantityOnHand}`);
      doc.text(`Desired: ${c.desiredQuantity}`);
      doc.text(`Location: ${c.location.room} - ${c.location.shelf}`);
      doc.moveDown();
    });

    doc.end();
    doc.pipe(res);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Example: Generate a PDF of all Training Vehicles and their needed repairs/parts.
 */
exports.generateVehiclesReport = async (req, res) => {
  try {
    const doc = new PDFDocument({ bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=vehicles_report.pdf');

    doc.text('Training Vehicles Report', { align: 'center', underline: true });
    doc.moveDown(2);

    const vehicles = await TrainingVehicle.find();
    vehicles.forEach((v) => {
      doc.fontSize(12).text(`Year/Make/Model: ${v.year} ${v.make} ${v.model}`);
      doc.text(`VIN: ${v.vin}`);
      doc.text(`RO#: ${v.roNumber}`);
      doc.text(`Repairs Needed: ${v.repairsNeeded}`);
      doc.text(`Parts Needed: ${v.partsNeeded}`);
      doc.moveDown();
    });

    doc.end();
    doc.pipe(res);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
