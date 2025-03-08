/**
 * Game service with Redis-based storage
 */
const redis = require('../utils/redisClient');

// Key constants
const GAME_STATE_KEY = 'game:state';
const ASSETS_KEY = 'game:assets';

const gameService = {
    /**
     * Get the current game state
     * @returns {Promise<Object>} Game state
     */
    async getGameState() {
        try {
            const data = await redis.get(GAME_STATE_KEY);
            return data ? JSON.parse(data) : { pieces: [] };
        } catch (err) {
            console.error('Error getting game state:', err);
            return { pieces: [] };
        }
    },

    /**
     * Save the game state
     * @param {Object} state - The game state to save
     * @returns {Promise<boolean>} Success indicator
     */
    async saveGameState(state) {
        try {
            await redis.set(GAME_STATE_KEY, JSON.stringify(state));
            return true;
        } catch (err) {
            console.error('Error saving game state:', err);
            return false;
        }
    },

    /**
     * Add a piece to the game
     * @param {Object} piece - The piece to add
     * @returns {Promise<boolean>} Success indicator
     */
    async addPiece(piece) {
        try {
            const state = await this.getGameState();
            state.pieces.push(piece);
            return await this.saveGameState(state);
        } catch (err) {
            console.error('Error adding piece:', err);
            return false;
        }
    },

    /**
     * Update a piece in the game
     * @param {string} pieceId - ID of the piece to update
     * @param {Object} updates - Properties to update
     * @returns {Promise<boolean>} Success indicator
     */
    async updatePiece(pieceId, updates) {
        try {
            const state = await this.getGameState();
            const pieceIndex = state.pieces.findIndex(p => p.id === pieceId);

            if (pieceIndex === -1) {
                return false;
            }

            state.pieces[pieceIndex] = {
                ...state.pieces[pieceIndex],
                ...updates
            };

            return await this.saveGameState(state);
        } catch (err) {
            console.error('Error updating piece:', err);
            return false;
        }
    },

    /**
     * Remove a piece from the game
     * @param {string} pieceId - ID of the piece to remove
     * @returns {Promise<boolean>} Success indicator
     */
    async removePiece(pieceId) {
        try {
            const state = await this.getGameState();
            state.pieces = state.pieces.filter(p => p.id !== pieceId);
            return await this.saveGameState(state);
        } catch (err) {
            console.error('Error removing piece:', err);
            return false;
        }
    },

    /**
     * Register an asset
     * @param {Object} asset - Asset metadata
     * @returns {Promise<boolean>} Success indicator
     */
    async registerAsset(asset) {
        try {
            const assetsData = await redis.get(ASSETS_KEY);
            const assets = assetsData ? JSON.parse(assetsData) : [];
            assets.push(asset);
            await redis.set(ASSETS_KEY, JSON.stringify(assets));
            return true;
        } catch (err) {
            console.error('Error registering asset:', err);
            return false;
        }
    },

    /**
     * Get all registered assets
     * @returns {Promise<Array>} Array of assets
     */
    async getAssets() {
        try {
            const assetsData = await redis.get(ASSETS_KEY);
            return assetsData ? JSON.parse(assetsData) : [];
        } catch (err) {
            console.error('Error getting assets:', err);
            return [];
        }
    }
};

module.exports = gameService;