/**
 * Game Manager - Handles game creation and management
 */
const redis = require('../../../utils/redisClient');
const { v4: uuidv4 } = require('uuid');
const { GAME_PREFIX, GAME_META_SUFFIX, GAME_STATES_SUFFIX, keys } = require('../constants/redisKeys');
const stateManager = require('./stateManager');

/**
 * Game management service
 */
const gameManager = {
    /**
     * Get all available games
     * @returns {Promise<Array>} Array of game metadata
     */
    async getGames() {
        try {
            // Get all keys matching the game prefix with meta suffix
            const metaKeys = await redis.keys(`${GAME_PREFIX}*${GAME_META_SUFFIX}`);

            const games = [];
            for (const key of metaKeys) {
                // Extract game ID from key
                const gameId = key.replace(GAME_PREFIX, '').replace(GAME_META_SUFFIX, '');

                // Get metadata
                const metadata = await redis.hgetall(key);

                // Get state count
                const statesKey = keys.statesKey(gameId);
                const stateCount = await redis.zcard(statesKey);

                games.push({
                    id: gameId,
                    name: metadata.name || `Game ${gameId}`,
                    createdAt: metadata.created_at,
                    lastModified: metadata.last_modified,
                    stateCount
                });
            }

            return games;
        } catch (err) {
            console.error('Error getting games:', err);
            return [];
        }
    },
    
    /**
     * Get a specific game by ID
     * @param {string} gameId - ID of the game to retrieve
     * @returns {Promise<Object|null>} Game or null if not found
     */
    async getGame(gameId) {
        try {
            const metaKey = keys.metaKey(gameId);
            const exists = await redis.exists(metaKey);
            
            if (!exists) {
                return null;
            }
            
            // Get metadata
            const metadata = await redis.hgetall(metaKey);
            
            // Get state count
            const statesKey = keys.statesKey(gameId);
            const stateCount = await redis.zcard(statesKey);
            
            return {
                id: gameId,
                name: metadata.name || `Game ${gameId}`,
                createdAt: metadata.created_at,
                lastModified: metadata.last_modified,
                stateCount
            };
        } catch (err) {
            console.error(`Error getting game ${gameId}:`, err);
            return null;
        }
    },

    /**
     * Create a new game
     * @param {string} [name] - Optional game name
     * @returns {Promise<Object>} Game info with ID
     */
    async createGame(name = null) {
        try {
            const gameId = uuidv4();
            const timestamp = Date.now();
            const gameName = name || `Game ${new Date(timestamp).toLocaleString()}`;

            // Create game metadata
            const metaKey = keys.metaKey(gameId);
            await redis.hset(metaKey, {
                'name': gameName,
                'created_at': new Date(timestamp).toISOString(),
                'last_modified': new Date(timestamp).toISOString()
            });

            // Create initial empty state
            const initialState = { pieces: [] };
            await stateManager.saveGameState(initialState, 'initial', gameId);

            return {
                success: true,
                gameId,
                name: gameName,
                createdAt: new Date(timestamp).toISOString()
            };
        } catch (err) {
            console.error('Error creating game:', err);
            return { success: false, error: err.message };
        }
    },
    
    /**
     * Delete a game
     * @param {string} gameId - ID of the game to delete
     * @returns {Promise<boolean>} Success indicator
     */
    async deleteGame(gameId) {
        try {
            const metaKey = keys.metaKey(gameId);
            const statesKey = keys.statesKey(gameId);
            const currentKey = keys.currentKey(gameId);
            
            // Delete all keys related to this game
            await redis.del(metaKey);
            await redis.del(statesKey);
            await redis.del(currentKey);
            
            return true;
        } catch (err) {
            console.error(`Error deleting game ${gameId}:`, err);
            return false;
        }
    },
    
    /**
     * Update game metadata
     * @param {string} gameId - ID of the game to update
     * @param {Object} metadata - Game metadata to update
     * @returns {Promise<boolean>} Success indicator
     */
    async updateGame(gameId, metadata) {
        try {
            const metaKey = keys.metaKey(gameId);
            const exists = await redis.exists(metaKey);
            
            if (!exists) {
                return false;
            }
            
            // Update metadata
            const updates = {
                ...(metadata.name && { 'name': metadata.name }),
                'last_modified': new Date().toISOString()
            };
            
            await redis.hset(metaKey, updates);
            return true;
        } catch (err) {
            console.error(`Error updating game ${gameId}:`, err);
            return false;
        }
    }
};

module.exports = gameManager;