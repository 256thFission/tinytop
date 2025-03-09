/**
 * Game Service - Main entry point for game functionality
 * 
 * Provides a unified API for all game-related operations including:
 * - Game state management (save, load, switch between states)
 * - Game CRUD operations (create, list, retrieve)
 * - Piece management (add, update, remove pieces)
 * - Asset management (register, retrieve assets)
 */

const stateManager = require('./managers/stateManager');
const pieceManager = require('./managers/pieceManager');
const assetManager = require('./managers/assetManager');
const gameManager = require('./managers/gameManager');
const { DEFAULT_GAME_ID } = require('./constants/redisKeys');

/**
 * Unified game service combining functionality from all managers
 */
const gameService = {
    // Constants
    DEFAULT_GAME_ID,
    
    // State Management
    getGameState: stateManager.getGameState.bind(stateManager),
    saveGameState: stateManager.saveGameState.bind(stateManager),
    getGameStates: stateManager.getGameStates.bind(stateManager),
    getCurrentState: stateManager.getCurrentState.bind(stateManager),
    switchToState: stateManager.switchToState.bind(stateManager),
    
    // Piece Management
    addPiece: pieceManager.addPiece.bind(pieceManager),
    updatePiece: pieceManager.updatePiece.bind(pieceManager),
    removePiece: pieceManager.removePiece.bind(pieceManager),
    getPiece: pieceManager.getPiece.bind(pieceManager),
    getAllPieces: pieceManager.getAllPieces.bind(pieceManager),
    
    // Asset Management
    registerAsset: assetManager.registerAsset.bind(assetManager),
    getAssets: assetManager.getAssets.bind(assetManager),
    getAssetById: assetManager.getAssetById.bind(assetManager),
    removeAsset: assetManager.removeAsset.bind(assetManager),
    
    // Game Management
    getGames: gameManager.getGames.bind(gameManager),
    getGame: gameManager.getGame.bind(gameManager),
    createGame: gameManager.createGame.bind(gameManager),
    deleteGame: gameManager.deleteGame.bind(gameManager),
    updateGame: gameManager.updateGame.bind(gameManager)
};

module.exports = gameService;