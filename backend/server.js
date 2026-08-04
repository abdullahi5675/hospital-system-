require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const clinicRoutes = require('./routes/clinicRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Set up server-side sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'super_secret_clinic_emr_key_development_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true if deploying over HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours session lifetime
  }
}));

// Route static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Primary API route boundary
app.use('/api', clinicRoutes);

// Error middleware fallback
app.use(errorHandler);

process.on('uncaughtException', (err) => console.error('Uncaught Context Intercepted safely:', err.message));
process.on('unhandledRejection', (reason) => console.error('Unhandled Promise logic safe update:', reason));

app.listen(PORT, () => console.log('EMR Engine up on port ' + PORT));