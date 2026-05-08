const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ message: 'Unauthorized. Please login.' });
}

// GET /api/reports/summary - Dashboard summary stats
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const [[totalSlots]] = await db.execute('SELECT COUNT(*) as total FROM ParkingSlot');
    const [[availableSlots]] = await db.execute("SELECT COUNT(*) as total FROM ParkingSlot WHERE SlotStatus = 'Available'");
    const [[occupiedSlots]] = await db.execute("SELECT COUNT(*) as total FROM ParkingSlot WHERE SlotStatus = 'Occupied'");
    const [[totalCars]] = await db.execute('SELECT COUNT(*) as total FROM Car');
    const [[totalRecords]] = await db.execute('SELECT COUNT(*) as total FROM ParkingRecord');
    const [[activeRecords]] = await db.execute('SELECT COUNT(*) as total FROM ParkingRecord WHERE ExitTime IS NULL');
    const [[totalRevenue]] = await db.execute('SELECT COALESCE(SUM(AmountPaid), 0) as total FROM Payment');
    const [[todayRevenue]] = await db.execute(
      "SELECT COALESCE(SUM(AmountPaid), 0) as total FROM Payment WHERE DATE(PaymentDate) = CURDATE()"
    );

    res.json({
      totalSlots: totalSlots.total,
      availableSlots: availableSlots.total,
      occupiedSlots: occupiedSlots.total,
      totalCars: totalCars.total,
      totalRecords: totalRecords.total,
      activeRecords: activeRecords.total,
      totalRevenue: totalRevenue.total,
      todayRevenue: todayRevenue.total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/reports/daily - Daily revenue report
router.get('/daily', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        DATE(p.PaymentDate) as Date,
        COUNT(p.PaymentID) as TotalTransactions,
        SUM(p.AmountPaid) as TotalRevenue,
        AVG(pr.Duration) as AvgDuration
      FROM Payment p
      JOIN ParkingRecord pr ON p.RecordID = pr.RecordID
      GROUP BY DATE(p.PaymentDate)
      ORDER BY Date DESC
      LIMIT 30
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/reports/active - Currently parked cars
router.get('/active', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        pr.RecordID,
        pr.PlateNumber,
        c.DriverName,
        c.PhoneNumber,
        pr.SlotNumber,
        pr.EntryTime,
        TIMESTAMPDIFF(MINUTE, pr.EntryTime, NOW()) as MinutesParked
      FROM ParkingRecord pr
      JOIN Car c ON pr.PlateNumber = c.PlateNumber
      WHERE pr.ExitTime IS NULL
      ORDER BY pr.EntryTime ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/reports/bills - All bills/invoices
router.get('/bills', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        p.PaymentID,
        p.RecordID,
        pr.PlateNumber,
        c.DriverName,
        c.PhoneNumber,
        pr.SlotNumber,
        pr.EntryTime,
        pr.ExitTime,
        pr.Duration,
        p.AmountPaid,
        p.PaymentDate
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

module.exports = router;
