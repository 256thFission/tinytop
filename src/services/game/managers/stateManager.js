/**
 * State Manager - Handles game state persistence and retrieval
 */
const redis = require('../../../utils/redisClient');
const { DEFAULT_GAME_ID, keys } = require('../constants/redisKeys');

/**
 * State management service
 */
const stateManager = {
    /**
     * Get the current game state
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<Object>} Game state
     */
    async getGameState(gameId = DEFAULT_GAME_ID) {
        try {
            return await this.getCurrentState(gameId);
        } catch (err) {
            console.error('Error getting game state:', err);
            return { pieces: [] };
        }
    },

    /**
     * Save the game state
     * @param {Object} state - The game state to save
     * @param {string} [stateName] - Optional name for the state
     * @param {boolean} [isManual=false] - Whether this is a manual save
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<Object>} Result with stateId
     */
    async saveGameState(state, stateName = null, gameId = DEFAULT_GAME_ID, isManual = false,) {
        try {
            // Generate timestamp and state ID
            const timestamp = Date.now();
            const stateId = stateName || `state-${timestamp}`;

            // Store the state in the sorted set
            const stateKey = keys.statesKey(gameId);
            await redis.zadd(stateKey, timestamp, JSON.stringify({
                id: stateId,
                name: stateName,
                data: state,
                savedAt: new Date(timestamp).toISOString(),
                isManual: isManual

            }));

            // Update current state pointer
            await redis.set(keys.currentKey(gameId), stateId);

            // Update game metadata if not exists
            const metaKey = keys.metaKey(gameId);
            const exists = await redis.exists(metaKey);

            if (!exists) {
                await redis.hset(metaKey, {
                    'created_at': new Date().toISOString(),
                    'name': gameId === DEFAULT_GAME_ID ? 'Default Game' : `Game ${gameId}`
                });
            }

            await redis.hset(metaKey, 'last_modified', new Date().toISOString());

            return {
                success: true,
                stateId,
                timestamp,
                savedAt: new Date(timestamp).toISOString(),
                name: stateName || stateId,
                isManual
            };
        } catch (err) {
            console.error('Error saving game state:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Get all saved states for a game
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @param {number} [limit=10] - Maximum number of states to retrieve
     *  @param {boolean} [manualOnly=false] - Whether to return only manual saves
     * @returns {Promise<Array>} Array of game states
     */
    async getGameStates(gameId = DEFAULT_GAME_ID, limit = 10, manualOnly = false) {
        try {
            // Get all states in reverse chronological order
            const stateKey = keys.statesKey(gameId);
            const states = await redis.zrevrange(stateKey, 0, -1); // Get all states

            // Parse and filter them
            let parsedStates = states.map(state => JSON.parse(state));

            // Apply manual-only filter if requested
            if (manualOnly) {
                parsedStates = parsedStates.filter(state => state.isManual === true);
            }

            // Apply limit
            return parsedStates.slice(0, limit);
        } catch (err) {
            console.error('Error getting game states:', err);
            return [];
        }
    },

    /**
     * Get the current state of a game
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<Object>} Game state
     */
    async getCurrentState(gameId = DEFAULT_GAME_ID) {
        try {
            // Get current state ID
            const currentStateId = await redis.get(keys.currentKey(gameId));

            if (!currentStateId) {
                return { pieces: [] }; // Default empty state
            }

            // Find this state in the sorted set
            const stateKey = keys.statesKey(gameId);
            const states = await redis.zrevrange(stateKey, 0, -1);

            // Parse states and find the current one
            for (const stateJson of states) {
                const state = JSON.parse(stateJson);
                if (state.id === currentStateId) {
                    return state.data;
                }
            }

            return { pieces: [] }; // Fallback if not found
        } catch (err) {
            console.error('Error getting current game state:', err);
            return { pieces: [] };
        }
    },

    /**
     * Switch to a specific saved state
     * @param {string} stateId - The state ID to switch to
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<boolean>} Success indicator
     */
    async switchToState(stateId, gameId = DEFAULT_GAME_ID) {
        try {
            // Set the current state pointer to the specified state
            await redis.set(keys.currentKey(gameId), stateId);

            // Update last_modified in metadata
            const metaKey = keys.metaKey(gameId);
            await redis.hset(metaKey, 'last_modified', new Date().toISOString());

            return true;
        } catch (err) {
            console.error('Error switching game state:', err);
            return false;
        }
    }
};

module.exports = stateManager;