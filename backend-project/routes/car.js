const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Unauthorized. Please login.' });
}

// GET /api/cars - Get all cars
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM Car ORDER BY PlateNumber');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/cars/:plateNumber - Get single car
router.get('/:plateNumber', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM Car WHERE PlateNumber = ?', [req.params.plateNumber]);
    if (rows.length === 0) return res.status(404).json({ message: 'Car not found.' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/cars - Register a new car
router.post('/', requireAuth, async (req, res) => {
  const { PlateNumber, DriverName, PhoneNumber } = req.body;

  if (!PlateNumber || !DriverName || !PhoneNumber) {
    return res.status(400).json({ message: 'PlateNumber, DriverName, and PhoneNumber are required.' });
  }

  try {
    await db.execute(
      'INSERT INTO Car (PlateNumber, DriverName, PhoneNumber) VALUES (?, ?, ?)',
      [PlateNumber, DriverName, PhoneNumber]
    );
    res.status(201).json({ message: 'Car registered successfully.', PlateNumber, DriverName, PhoneNumber });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Car with this plate number already exists.' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/cars/:plateNumber - Update car info
router.put('/:plateNumber', requireAuth, async (req, res) => {
  const { DriverName, PhoneNumber } = req.body;

  try {
    const [result] = await db.execute(
      'UPDATE Car SET DriverName = ?, PhoneNumber = ? WHERE PlateNumber = ?',
      [DriverName, PhoneNumber, req.params.plateNumber]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Car not found.' });
    res.json({ message: 'Car updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/cars/:plateNumber - Delete a car
router.delete('/:plateNumber', requireAuth, async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM Car WHERE PlateNumber = ?', [req.params.plateNumber]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Car not found.' });
    res.json({ message: 'Car deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
