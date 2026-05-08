const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Unauthorized. Please login.' });
}

const RATE_PER_HOUR = 500;

function calculateFee(durationHours) {
  const billableHours = durationHours < 1 ? 1 : Math.ceil(durationHours);
  return billableHours * RATE_PER_HOUR;
}

// GET /api/payments - Get all payments with full details
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        p.PaymentID,
        p.RecordID,
        p.AmountPaid,
        p.PaymentDate,
        pr.PlateNumber,
        pr.SlotNumber,
        pr.EntryTime,
        pr.ExitTime,
        pr.Duration,
        c.DriverName,
        c.PhoneNumber
      FROM Payment p
      JOIN ParkingRecord pr ON p.RecordID = pr.RecordID
      JOIN Car c ON pr.PlateNumber = c.PlateNumber
      ORDER BY p.PaymentDate DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/payments/:id - Get single payment (bill)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        p.PaymentID,
        p.RecordID,
        p.AmountPaid,
        p.PaymentDate,
        pr.PlateNumber,
        pr.SlotNumber,
        pr.EntryTime,
        pr.ExitTime,
        pr.Duration,
        c.DriverName,
        c.PhoneNumber
      FROM Payment p
      JOIN ParkingRecord pr ON p.RecordID = pr.RecordID
      JOIN Car c ON pr.PlateNumber = c.PlateNumber
      WHERE p.PaymentID = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Payment not found.' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/payments/record/:recordId - Get payment by record ID
router.get('/record/:recordId', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        p.PaymentID,
        p.RecordID,
        p.AmountPaid,
        p.PaymentDate,
        pr.PlateNumber,
        pr.SlotNumber,
        pr.EntryTime,
        pr.ExitTime,
        pr.Duration,
        c.DriverName,
        c.PhoneNumber
      FROM Payment p
      JOIN ParkingRecord pr ON p.RecordID = pr.RecordID
      JOIN Car c ON pr.PlateNumber = c.PlateNumber
      WHERE p.RecordID = ?
    `, [req.params.recordId]);
    if (rows.length === 0) return res.status(404).json({ message: 'No payment found for this record.' });
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/payments - Record a payment
router.post('/', requireAuth, async (req, res) => {
  const { RecordID, AmountPaid, PaymentDate } = req.body;

  if (!RecordID || AmountPaid === undefined) {
    return res.status(400).json({ message: 'RecordID and AmountPaid are required.' });
  }

  try {
    // Verify record exists and has exit time
    const [records] = await db.execute(`
      SELECT pr.*, c.DriverName, c.PhoneNumber 
      FROM ParkingRecord pr 
      JOIN Car c ON pr.PlateNumber = c.PlateNumber 
      WHERE pr.RecordID = ?
    `, [RecordID]);

    if (records.length === 0) {
      return res.status(404).json({ message: 'Parking record not found.' });
    }

    const record = records[0];

    if (!record.ExitTime) {
      return res.status(400).json({ message: 'Car has not exited yet. Cannot process payment.' });
    }

    // Check if payment already exists
    const [existingPayment] = await db.execute('SELECT * FROM Payment WHERE RecordID = ?', [RecordID]);
    if (existingPayment.length > 0) {
      return res.status(409).json({ message: 'Payment already recorded for this parking session.' });
    }

    const paymentDate = PaymentDate || new Date().toISOString().slice(0, 19).replace('T', ' ');
    const expectedAmount = calculateFee(record.Duration);

    const [result] = await db.execute(
      'INSERT INTO Payment (RecordID, AmountPaid, PaymentDate) VALUES (?, ?, ?)',
      [RecordID, AmountPaid, paymentDate]
    );

    res.status(201).json({
      message: 'Payment recorded successfully.',
      PaymentID: result.insertId,
      RecordID,
      AmountPaid,
      PaymentDate: paymentDate,
      PlateNumber: record.PlateNumber,
      DriverName: record.DriverName,
      PhoneNumber: record.PhoneNumber,
      SlotNumber: record.SlotNumber,
      EntryTime: record.EntryTime,
      ExitTime: record.ExitTime,
      Duration: record.Duration,
      ExpectedAmount: expectedAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/payments/bill/:recordId - Generate bill for a record
router.get('/bill/:recordId', requireAuth, async (req, res) => {
  try {
    const [records] = await db.execute(`
      SELECT 
        pr.RecordID,
        pr.PlateNumber,
        pr.SlotNumber,
        pr.EntryTime,
        pr.ExitTime,
        pr.Duration,
        c.DriverName,
        c.PhoneNumber,
        p.AmountPaid,
        p.PaymentDate,
        p.PaymentID
      FROM ParkingRecord pr
      JOIN Car c ON pr.PlateNumber = c.PlateNumber
      LEFT JOIN Payment p ON pr.RecordID = p.RecordID
      WHERE pr.RecordID = ?
    `, [req.params.recordId]);

    if (records.length === 0) {
      return res.status(404).json({ message: 'Record not found.' });
    }

    const record = records[0];
    const amountDue = record.Duration ? calculateFee(record.Duration) : 0;

    res.json({
      ...record,
      AmountDue: amountDue,
      RatePerHour: RATE_PER_HOUR,
      BillableHours: record.Duration ? (record.Duration < 1 ? 1 : Math.ceil(record.Duration)) : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
