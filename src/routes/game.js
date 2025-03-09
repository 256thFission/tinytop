/**
 * Game routes
 */
const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Get current game state
router.get('/', gameController.getGameState);

// Save game state
router.post('/save', gameController.saveGameState);

// Get list of saved states
router.get('/states', gameController.getSavedStates);

// Load a specific state
router.post('/load-state', gameController.loadSavedState);

// Get all games
router.get('/list', gameController.getAllGames);

// Create a new game
router.post('/create', gameController.createGame);

module.exports = router;