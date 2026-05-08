const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware: check authentication
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Unauthorized. Please login.' });
}

// GET /api/slots - Get all parking slots
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM ParkingSlot ORDER BY SlotNumber');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/slots/available - Get available slots
router.get('/available', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM ParkingSlot WHERE SlotStatus = 'Available' ORDER BY SlotNumber");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/slots/:slotNumber - Get single slot
router.get('/:slotNumber', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM ParkingSlot WHERE SlotNumber = ?', [req.params.slotNumber]);
    if (rows.length === 0) return res.status(404).json({ message: 'Slot not found.' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/slots - Add new parking slot
router.post('/', requireAuth, async (req, res) => {
  const { SlotNumber, SlotStatus } = req.body;

  if (!SlotNumber) {
    return res.status(400).json({ message: 'SlotNumber is required.' });
  }

  const status = SlotStatus || 'Available';

  try {
    await db.execute('INSERT INTO ParkingSlot (SlotNumber, SlotStatus) VALUES (?, ?)', [SlotNumber, status]);
    res.status(201).json({ message: 'Parking slot added successfully.', SlotNumber, SlotStatus: status });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Slot number already exists.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/slots/:slotNumber - Update slot status
router.put('/:slotNumber', requireAuth, async (req, res) => {
  const { SlotStatus } = req.body;

  if (!SlotStatus) {
    return res.status(400).json({ message: 'SlotStatus is required.' });
  }

  try {
    const [result] = await db.execute(
      'UPDATE ParkingSlot SET SlotStatus = ? WHERE SlotNumber = ?',
      [SlotStatus, req.params.slotNumber]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Slot not found.' });
    res.json({ message: 'Slot updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/slots/:slotNumber - Delete a slot
router.delete('/:slotNumber', requireAuth, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM ParkingSlot WHERE SlotNumber = ?', [req.params.slotNumber]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Slot not found.' });
    res.json({ message: 'Slot deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
