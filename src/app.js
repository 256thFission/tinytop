/**
 * Express application setup
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// Create Express application
const app = express();

// Import routes
const apiRoutes = require('./routes');

// Ensure uploads directory exists
if (!fs.existsSync(config.uploads.directory)) {
  fs.mkdirSync(config.uploads.directory, { recursive: true });
}

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Function to initialize the app with Socket.io
const initializeApp = (io) => {
  // Create and use Socket.io middleware
  const createSocketMiddleware = require('./middleware/socketIo');
  app.use(createSocketMiddleware(io));
  
  // Static file serving
  app.use(express.static(config.staticFiles.public));
  app.use('/assets', express.static(config.uploads.directory));
  
  // Mount API routes
  app.use('/api', apiRoutes);
  
  // Handle 404s
  app.use((req, res) => {
    if (req.accepts('html')) {
      // Serve index.html for all non-API routes to support client-side routing
      res.sendFile(path.join(config.staticFiles.public, 'index.html'));
    } else {
      res.status(404).json({
        error: 'Not found',
        message: `Route ${req.url} not found`
      });
    }
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    res.status(err.status || 500).json({
      error: 'Server error',
      message: err.message || 'An unexpected error occurred'
    });
  });
};

// Export app and initialization function
module.exports = { app, initializeApp };