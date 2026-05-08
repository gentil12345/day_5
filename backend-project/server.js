const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS - allow frontend
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'smartpark_secret_2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true in production with HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
  },
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/slots', require('./routes/parkingSlot'));
app.use('/api/cars', require('./routes/car'));
app.use('/api/records', require('./routes/parkingRecord'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/reports', require('./routes/reports'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'SmartPark PSSMS API is running', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n🚗 SmartPark PSSMS Backend running on http://localhost:${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health\n`);
});
