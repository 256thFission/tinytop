/**
 * Game Controller
 * 
 * Handles HTTP requests related to game state management
 */
const gameService = require('../services/game');
const {getGameStates} = require("../services/game/managers/stateManager");
const { DEFAULT_GAME_ID } = gameService;

/**
 * Get the current game state
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getGameState = async (req, res) => {
  try {
    const gameState = await gameService.getGameState();
    res.json({
      success: true,
      game: gameState
    });
  } catch (err) {
    console.error('Error getting game state:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Save game state with a name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.saveGameState = async (req, res) => {
  try {
    const { name, clientId } = req.body;

    // Get current game state
    const gameState = await gameService.getGameState();

    // Add metadata for the save
    const saveData = {
      ...gameState,
      savedAt: new Date().toISOString()
    };

    // Save the game state
    const result = await gameService.saveGameState(saveData, name,DEFAULT_GAME_ID,true);

    if (result.success) {
      // Debug info
      console.log('Socket.io available:', req.io ? 'Yes' : 'No');
      
      if (req.io) {
        req.io.emit('game-saved', {
          savedAt: result.savedAt,
          name: result.name,
          stateId: result.stateId,
          savedBy: clientId || null,
          isManual: true
        });
      } else {
        console.error('Socket.io instance not available in request');
      }

      res.json({
        success: true,
        message: 'Game saved successfully',
        savedAt: result.savedAt,
        name: result.name,
        stateId: result.stateId,
        isManual: true
      });
    } else {
      res.status(500).json({ error: 'Failed to save game' });
    }
  } catch (err) {
    console.error('Error saving game state:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get list of saved game states
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSavedStates = async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const manualOnly = req.query.manualOnly !== 'false'; // Default to true

    const savedStates = await getGameStates(DEFAULT_GAME_ID, limit, manualOnly);

    res.json({
      success: true,
      states: savedStates.map(state => ({
        id: state.id,
        name: state.name || state.id,
        savedAt: state.savedAt
      }))
    });
  } catch (err) {
    console.error('Error getting saved states:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Load a specific saved state
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.loadSavedState = async (req, res) => {
  try {
    const { stateId, clientId } = req.body;

    if (!stateId) {
      return res.status(400).json({ error: 'State ID is required' });
    }

    // Switch to this state
    const success = await gameService.switchToState(stateId);

    if (success) {
      // Get the state after switching
      const gameState = await gameService.getGameState();

      // Debug info
      console.log('Socket.io available:', req.io ? 'Yes' : 'No');
      
      if (req.io) {
        // Broadcast state change to all clients
        req.io.emit('game-state-loaded', {
          stateId,
          loadedBy: clientId || null
        });

        // Also send the new game state
        req.io.emit('game-state', gameState);
      } else {
        console.error('Socket.io instance not available in request');
      }

      res.json({
        success: true,
        message: 'State loaded successfully',
        stateId
      });
    } else {
      res.status(500).json({ error: 'Failed to load state' });
    }
  } catch (err) {
    console.error('Error loading game state:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all available games
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllGames = async (req, res) => {
  try {
    const games = await gameService.getGames();
    res.json({
      success: true,
      games
    });
  } catch (err) {
    console.error('Error getting games:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Create a new game
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createGame = async (req, res) => {
  try {
    const { name } = req.body;
    const result = await gameService.createGame(name);
    
    if (result.success) {
      res.json({
        success: true,
        game: {
          id: result.gameId,
          name: result.name,
          createdAt: result.createdAt
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to create game' });
    }
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Server error' });
  }
};