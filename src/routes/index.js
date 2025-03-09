/**
 * Main router file that combines all routes
 */
const express = require('express');
const router = express.Router();

// Import route modules
const gameRoutes = require('./game');
const assetRoutes = require('./assets');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Mount routes
router.use('/game', gameRoutes);
router.use('/assets', assetRoutes);

module.exports = router;