// index.js
const express = require('express');
const helmet = require('helmet');
require('dotenv').config(); // Load environment variables early

// Import routes
const instagramRoutes = require('./routes/instagram');

// Initialize the Express app
const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
// Use Helmet to set security-related HTTP headers
// We are configuring CSP to explicitly allow connections to self,
// which can help with some browser-internal requests like the one from Chrome DevTools.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "connect-src": ["'self'"],
      },
    },
  })
);
// Middleware to parse JSON bodies
app.use(express.json());

// --- Routes ---
// Use the Instagram routes for any requests to /api/instagram
app.use('/api/instagram', instagramRoutes);

// --- Global Error Handler (Optional but good practice) ---
// This catches any errors that aren't handled in the route handlers
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
