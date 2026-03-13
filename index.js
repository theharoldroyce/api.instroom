// index.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const instagramRoutes = require('./routes/instagram');
const tiktokRoutes = require('./routes/tiktok');

const app = express();
const port = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Rate limiting: max 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/', instagramRoutes);
app.use('/', tiktokRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
