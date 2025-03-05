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
 */exports.generateToolsReport = async (req, res) => {
  try {
    // 1) Initialize a PDFDoc in landscape mode
    const doc = new PDFDocument({
      size: 'A4',        // A4 size paper
      layout: 'landscape',  // landscape orientation
      margin: 40,
      bufferPages: true,
    });

    // Setup headers so it downloads as "tools_report.pdf"
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=tools_report.pdf');

    // 2) Pipe doc output to the response
    doc.pipe(res);

    // 3) Add a title at the top, centered
    doc.fontSize(16).text('Tools Report', {
      align: 'center',
      underline: true,
    });
    doc.moveDown(1.5);

    // 4) Table Headers (Position them horizontally in columns)
    // We'll pick arbitrary X-positions for each column
    // Then draw a simple horizontal line
    doc.font('Helvetica-Bold').fontSize(10);
    const startY = doc.y; // current vertical position
    doc.text('Name',        50,  startY);
    doc.text('Part #',      180, startY);
    doc.text('Qty On Hand', 300, startY);
    doc.text('Expected',    390, startY);
    doc.text('Missing',     460, startY);
    doc.text('Drawer #',    530, startY);
    doc.text('Shelf',       620, startY);

    // Draw a line under the headers
    doc.moveTo(40, startY + 15)
       .lineTo(750, startY + 15)
       .stroke();

    // 5) Fetch tools from DB (assumes you have expectedQuantity in your schema)
    const tools = await Tool.find();

    // 6) Vertical spacing for each row
    let rowY = startY + 25;
    const rowHeight = 20; // how tall each row is

    // 7) Loop each tool as a row in the table
    tools.forEach((tool, i) => {
      // Compute "missing" items
      const onHand = tool.quantityOnHand || 0;
      const expected = tool.expectedQuantity || 1;
      const missing = Math.max(0, expected - onHand);

      // Alternate background shading: if i is even, draw a light-gray rect
      if (i % 2 === 0) {
        doc.save();
        doc.rect(40, rowY - 2, 710, rowHeight) // leftX, topY, width, height
           .fillColor('#eeeeee')
           .fill();
        doc.restore();
      }

      // If onHand < expected, we bold this row
      if (onHand < expected) {
        doc.font('Helvetica-Bold');
      } else {
        doc.font('Helvetica');
      }

      // "Drawer #" if numeric, else just show location.room
      let drawerText = tool.location?.room || '';
      const isNumeric = !isNaN(parseInt(drawerText, 10));
      if (isNumeric) {
        drawerText = `Drawer #${drawerText}`;
      }

      // Print each column at the chosen x-coordinates, on rowY
      doc.fontSize(9);
      doc.text(tool.name || '',          50, rowY, { width: 120 });
      doc.text(tool.partnum || '',      180, rowY, { width: 110 });
      doc.text(`${onHand}`,            300, rowY, { width: 70, align: 'right' });
      doc.text(`${expected}`,          390, rowY, { width: 60, align: 'right' });
      
      // Show missing if > 0, otherwise '-'
      doc.text(missing > 0 ? `${missing}` : '-', 460, rowY, { width: 60, align: 'right' });
      doc.text(drawerText,             530, rowY, { width: 80 });
      doc.text(tool.location?.shelf || '', 620, rowY, { width: 80 });

      // move to the next row
      rowY += rowHeight;

      // if we near the bottom, add a new page
      if (rowY > doc.page.height - 50) {
        doc.addPage();
        rowY = 50; // reset rowY
      }
    });

    // 8) End and finalize the PDF
    doc.end();

  } catch (error) {
    console.error('[generateToolsReport] Error:', error);
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
