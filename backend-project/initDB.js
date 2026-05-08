const mysql = require('mysql2/promise');
require('dotenv').config();

async function initializeDatabase() {
  // Connect without specifying a database first
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
  });

  try {
    // Create database
    await connection.execute(`CREATE DATABASE IF NOT EXISTS PSSMS`);
    console.log('Database PSSMS created or already exists.');

    await connection.execute(`USE PSSMS`);

    // Create ParkingSlot table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ParkingSlot (
        SlotNumber VARCHAR(10) PRIMARY KEY,
        SlotStatus ENUM('Available', 'Occupied') NOT NULL DEFAULT 'Available'
      )
    `);
    console.log('ParkingSlot table ready.');

    // Create Car table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Car (
        PlateNumber VARCHAR(20) PRIMARY KEY,
        DriverName VARCHAR(100) NOT NULL,
        PhoneNumber VARCHAR(20) NOT NULL
      )
    `);
    console.log('Car table ready.');

    // Create ParkingRecord table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ParkingRecord (
        RecordID INT AUTO_INCREMENT PRIMARY KEY,
        PlateNumber VARCHAR(20) NOT NULL,
        SlotNumber VARCHAR(10) NOT NULL,
        EntryTime DATETIME NOT NULL,
        ExitTime DATETIME,
        Duration DECIMAL(10,2),
        FOREIGN KEY (PlateNumber) REFERENCES Car(PlateNumber) ON UPDATE CASCADE,
        FOREIGN KEY (SlotNumber) REFERENCES ParkingSlot(SlotNumber) ON UPDATE CASCADE
      )
    `);
    console.log('ParkingRecord table ready.');

    // Create Payment table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Payment (
        PaymentID INT AUTO_INCREMENT PRIMARY KEY,
        RecordID INT NOT NULL,
        AmountPaid DECIMAL(10,2) NOT NULL,
        PaymentDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (RecordID) REFERENCES ParkingRecord(RecordID) ON DELETE CASCADE
      )
    `);
    console.log('Payment table ready.');

    // Create Users table for session-based login
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Users (
        UserID INT AUTO_INCREMENT PRIMARY KEY,
        Username VARCHAR(50) UNIQUE NOT NULL,
        Password VARCHAR(255) NOT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table ready.');

    // Insert default admin user (password: Admin@SmartPark2025)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Admin@SmartPark2025', 12);
    await connection.execute(`
      INSERT IGNORE INTO Users (Username, Password) VALUES (?, ?)
    `, ['admin', hashedPassword]);
    console.log('Default admin user created (username: admin, password: Admin@SmartPark2025)');

    console.log('\n✅ Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

initializeDatabase().catch(console.error);
