/**
 * Piece Manager - Handles game piece operations
 */
const { DEFAULT_GAME_ID } = require('../constants/redisKeys');
const stateManager = require('./stateManager');

/**
 * Piece management service
 */
const pieceManager = {
    /**
     * Add a piece to the game
     * @param {Object} piece - The piece to add
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<boolean>} Success indicator
     */
    async addPiece(piece, gameId = DEFAULT_GAME_ID) {
        try {
            const state = await stateManager.getGameState(gameId);
            state.pieces.push(piece);
            const result = await stateManager.saveGameState(state, null, gameId);
            return result.success;
        } catch (err) {
            console.error('Error adding piece:', err);
            return false;
        }
    },

    /**
     * Update a piece in the game
     * @param {string} pieceId - ID of the piece to update
     * @param {Object} updates - Properties to update
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<boolean>} Success indicator
     */
    async updatePiece(pieceId, updates, gameId = DEFAULT_GAME_ID) {
        try {
            const state = await stateManager.getGameState(gameId);
            const pieceIndex = state.pieces.findIndex(p => p.id === pieceId);

            if (pieceIndex === -1) {
                return false;
            }

            state.pieces[pieceIndex] = {
                ...state.pieces[pieceIndex],
                ...updates
            };

            const result = await stateManager.saveGameState(state, null, gameId);
            return result.success;
        } catch (err) {
            console.error('Error updating piece:', err);
            return false;
        }
    },

    /**
     * Remove a piece from the game
     * @param {string} pieceId - ID of the piece to remove
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<boolean>} Success indicator
     */
    async removePiece(pieceId, gameId = DEFAULT_GAME_ID) {
        try {
            const state = await stateManager.getGameState(gameId);
            state.pieces = state.pieces.filter(p => p.id !== pieceId);
            const result = await stateManager.saveGameState(state, null, gameId);
            return result.success;
        } catch (err) {
            console.error('Error removing piece:', err);
            return false;
        }
    },
    
    /**
     * Get a piece by ID
     * @param {string} pieceId - ID of the piece to find
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<Object|null>} Piece or null if not found
     */
    async getPiece(pieceId, gameId = DEFAULT_GAME_ID) {
        try {
            const state = await stateManager.getGameState(gameId);
            return state.pieces.find(p => p.id === pieceId) || null;
        } catch (err) {
            console.error('Error getting piece:', err);
            return null;
        }
    },
    
    /**
     * Get all pieces in a game
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<Array>} Array of pieces
     */
    async getAllPieces(gameId = DEFAULT_GAME_ID) {
        try {
            const state = await stateManager.getGameState(gameId);
            return state.pieces || [];
        } catch (err) {
            console.error('Error getting all pieces:', err);
            return [];
        }
    }
};

module.exports = pieceManager;