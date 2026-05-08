const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Unauthorized. Please login.' });
}

// Helper: calculate duration in hours
function calculateDuration(entryTime, exitTime) {
  const entry = new Date(entryTime);
  const exit = new Date(exitTime);
  const diffMs = exit - entry;
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, parseFloat(diffHours.toFixed(2)));
}

// Helper: calculate fee (500 RWF per hour, minimum 1 hour)
function calculateFee(durationHours) {
  const RATE_PER_HOUR = 500;
  const billableHours = durationHours < 1 ? 1 : Math.ceil(durationHours);
  return billableHours * RATE_PER_HOUR;
}

// GET /api/records - Get all parking records with car and slot info
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        pr.RecordID,
        pr.PlateNumber,
        c.DriverName,
        c.PhoneNumber,
        pr.SlotNumber,
        pr.EntryTime,
        pr.ExitTime,
        pr.Duration,
        p.AmountPaid,
        p.PaymentDate,
        p.PaymentID
      FROM ParkingRecord pr
      JOIN Car c ON pr.PlateNumber = c.PlateNumber
      LEFT JOIN Payment p ON pr.RecordID = p.RecordID
      ORDER BY pr.EntryTime DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/records/:id - Get single record
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        pr.*,
        c.DriverName,
        c.PhoneNumber,
        p.AmountPaid,
        p.PaymentDate,
        p.PaymentID
      FROM ParkingRecord pr
      JOIN Car c ON pr.PlateNumber = c.PlateNumber
      LEFT JOIN Payment p ON pr.RecordID = p.RecordID
      WHERE pr.RecordID = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Record not found.' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/records - Create new parking record (car entry)
router.post('/', requireAuth, async (req, res) => {
  const { PlateNumber, SlotNumber, EntryTime } = req.body;

  if (!PlateNumber || !SlotNumber || !EntryTime) {
    return res.status(400).json({ message: 'PlateNumber, SlotNumber, and EntryTime are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Check car exists
    const [carRows] = await conn.execute('SELECT * FROM Car WHERE PlateNumber = ?', [PlateNumber]);
    if (carRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Car not found. Please register the car first.' });
    }

    // Check slot exists and is available
    const [slotRows] = await conn.execute('SELECT * FROM ParkingSlot WHERE SlotNumber = ?', [SlotNumber]);
    if (slotRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Slot not found.' });
    }
    if (slotRows[0].SlotStatus === 'Occupied') {
      await conn.rollback();
      return res.status(409).json({ message: 'Slot is already occupied.' });
    }

    // Insert parking record
    const [result] = await conn.execute(
      'INSERT INTO ParkingRecord (PlateNumber, SlotNumber, EntryTime) VALUES (?, ?, ?)',
      [PlateNumber, SlotNumber, EntryTime]
    );

    // Update slot status to Occupied
    await conn.execute("UPDATE ParkingSlot SET SlotStatus = 'Occupied' WHERE SlotNumber = ?", [SlotNumber]);

    await conn.commit();
    res.status(201).json({
      message: 'Car entry recorded successfully.',
      RecordID: result.insertId,
      PlateNumber,
      SlotNumber,
      EntryTime,
    });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    conn.release();
  }
});

// PUT /api/records/:id - Update record (car exit - calculates duration)
router.put('/:id', requireAuth, async (req, res) => {
  const { ExitTime } = req.body;

  if (!ExitTime) {
    return res.status(400).json({ message: 'ExitTime is required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [records] = await conn.execute('SELECT * FROM ParkingRecord WHERE RecordID = ?', [req.params.id]);
    if (records.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Record not found.' });
    }

    const record = records[0];
    if (record.ExitTime) {
      await conn.rollback();
      return res.status(400).json({ message: 'Car has already exited.' });
    }

    const duration = calculateDuration(record.EntryTime, ExitTime);
    const amountDue = calculateFee(duration);

    // Update record with exit time and duration
    await conn.execute(
      'UPDATE ParkingRecord SET ExitTime = ?, Duration = ? WHERE RecordID = ?',
      [ExitTime, duration, req.params.id]
    );

    // Free up the slot
    await conn.execute("UPDATE ParkingSlot SET SlotStatus = 'Available' WHERE SlotNumber = ?", [record.SlotNumber]);

    await conn.commit();
    res.json({
      message: 'Car exit recorded successfully.',
      RecordID: record.RecordID,
      PlateNumber: record.PlateNumber,
      SlotNumber: record.SlotNumber,
      EntryTime: record.EntryTime,
      ExitTime,
      Duration: duration,
      AmountDue: amountDue,
    });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    conn.release();
  }
});

// DELETE /api/records/:id - Delete a parking record
router.delete('/:id', requireAuth, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [records] = await conn.execute('SELECT * FROM ParkingRecord WHERE RecordID = ?', [req.params.id]);
    if (records.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Record not found.' });
    }

    const record = records[0];

    // If car hasn't exited, free the slot
    if (!record.ExitTime) {
      await conn.execute("UPDATE ParkingSlot SET SlotStatus = 'Available' WHERE SlotNumber = ?", [record.SlotNumber]);
    }

    await conn.execute('DELETE FROM ParkingRecord WHERE RecordID = ?', [req.params.id]);

    await conn.commit();
    res.json({ message: 'Record deleted successfully.' });
  } catch (error) {
    await conn.rollback();
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
