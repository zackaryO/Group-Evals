// server/routes/dealerships.js
//
// Master dealership directory routes.
//   - Reads (GET): any authenticated user. The directory is the cross-student
//     shared registry of dealerships, so students can pick an existing record
//     instead of creating a duplicate.
//   - Create (POST): any authenticated user — the first student to apply to a
//     dealer creates the shared record, and `createdBy` is recorded.
//   - Edit (PUT): any authenticated user. The directory is for the students'
//     benefit; if a student finds an error in a dealer's info they should be
//     able to fix it directly. `updatedBy` is recorded so we have an audit
//     pointer.
//   - Delete (DELETE): staff only — deleting a dealer would orphan every
//     student's application linked to it.
//   - Alumni sub-resource: staff only.

const express = require('express');
const router = express.Router();
const Dealership = require('../models/Dealership');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const STAFF = ['instructor', 'admin'];

// GET /api/dealerships?search=foo
//   Returns list of dealerships, optionally filtered by name/city/state.
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    if (search && search.trim()) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter = { $or: [{ name: rx }, { city: rx }, { state: rx }] };
    }
    const dealerships = await Dealership.find(filter).sort({ name: 1 }).lean();
    res.json(dealerships);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dealerships/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const d = await Dealership.findById(req.params.id).lean();
    if (!d) return res.status(404).json({ message: 'Dealership not found' });
    res.json(d);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/dealerships    (any authenticated user)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, city, state, address, website, mainPhone, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Dealership name is required' });
    }
    const dealer = await Dealership.create({
      name: name.trim(),
      city,
      state,
      address,
      website,
      mainPhone,
      notes,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });
    res.status(201).json(dealer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/dealerships/:id    (any authenticated user; updatedBy is recorded)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const dealer = await Dealership.findById(req.params.id);
    if (!dealer) return res.status(404).json({ message: 'Dealership not found' });
    ['name', 'city', 'state', 'address', 'website', 'mainPhone', 'notes'].forEach((k) => {
      if (req.body[k] !== undefined) dealer[k] = req.body[k];
    });
    dealer.updatedBy = req.user.id;
    await dealer.save();
    res.json(dealer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/dealerships/:id    (staff only)
router.delete('/:id', authenticateToken, authorizeRoles(...STAFF), async (req, res) => {
  try {
    const d = await Dealership.findByIdAndDelete(req.params.id);
    if (!d) return res.status(404).json({ message: 'Dealership not found' });
    res.json({ message: 'Dealership deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Alumni sub-resource (staff only) ---

// POST /api/dealerships/:id/alumni
router.post('/:id/alumni', authenticateToken, authorizeRoles(...STAFF), async (req, res) => {
  try {
    const dealer = await Dealership.findById(req.params.id);
    if (!dealer) return res.status(404).json({ message: 'Dealership not found' });
    dealer.alumni.push({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      gradYear: req.body.gradYear,
      currentlyEmployed: !!req.body.currentlyEmployed,
      role: req.body.role,
      contactInfo: req.body.contactInfo,
      notes: req.body.notes,
    });
    await dealer.save();
    res.status(201).json(dealer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/dealerships/:id/alumni/:alumniId
router.put('/:id/alumni/:alumniId', authenticateToken, authorizeRoles(...STAFF), async (req, res) => {
  try {
    const dealer = await Dealership.findById(req.params.id);
    if (!dealer) return res.status(404).json({ message: 'Dealership not found' });
    const alum = dealer.alumni.id(req.params.alumniId);
    if (!alum) return res.status(404).json({ message: 'Alumni entry not found' });
    ['firstName', 'lastName', 'gradYear', 'role', 'contactInfo', 'notes'].forEach((k) => {
      if (req.body[k] !== undefined) alum[k] = req.body[k];
    });
    if (req.body.currentlyEmployed !== undefined) alum.currentlyEmployed = !!req.body.currentlyEmployed;
    await dealer.save();
    res.json(dealer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/dealerships/:id/alumni/:alumniId
router.delete('/:id/alumni/:alumniId', authenticateToken, authorizeRoles(...STAFF), async (req, res) => {
  try {
    const dealer = await Dealership.findById(req.params.id);
    if (!dealer) return res.status(404).json({ message: 'Dealership not found' });
    const alum = dealer.alumni.id(req.params.alumniId);
    if (!alum) return res.status(404).json({ message: 'Alumni entry not found' });
    alum.deleteOne();
    await dealer.save();
    res.json(dealer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
