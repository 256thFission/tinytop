/**
 * Game service with Redis-based storage for multiple game states
 */
const redis = require('../utils/redisClient');
const { v4: uuidv4 } = require('uuid');

// Key constants
const GAME_PREFIX = 'game:';
const GAME_STATES_SUFFIX = ':states';
const GAME_META_SUFFIX = ':meta';
const GAME_CURRENT_SUFFIX = ':current';
const ASSETS_KEY = 'game:assets';

// Default game ID (for backward compatibility)
const DEFAULT_GAME_ID = 'default';

const gameService = {
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
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<Object>} Result with stateId
     */
    async saveGameState(state, stateName = null, gameId = DEFAULT_GAME_ID) {
        try {
            // Generate timestamp and state ID
            const timestamp = Date.now();
            const stateId = stateName || `state-${timestamp}`;

            // Store the state in the sorted set
            const stateKey = `${GAME_PREFIX}${gameId}${GAME_STATES_SUFFIX}`;
            await redis.zadd(stateKey, timestamp, JSON.stringify({
                id: stateId,
                name: stateName,
                data: state,
                savedAt: new Date(timestamp).toISOString()
            }));

            // Update current state pointer
            await redis.set(`${GAME_PREFIX}${gameId}${GAME_CURRENT_SUFFIX}`, stateId);

            // Update game metadata if not exists
            const metaKey = `${GAME_PREFIX}${gameId}${GAME_META_SUFFIX}`;
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
                name: stateName || stateId
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
     * @returns {Promise<Array>} Array of game states
     */
    async getGameStates(gameId = DEFAULT_GAME_ID, limit = 10) {
        try {
            // Get the most recent states (adjust range as needed)
            const stateKey = `${GAME_PREFIX}${gameId}${GAME_STATES_SUFFIX}`;
            const states = await redis.zrevrange(stateKey, 0, limit - 1);

            return states.map(state => JSON.parse(state));
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
            const currentStateId = await redis.get(`${GAME_PREFIX}${gameId}${GAME_CURRENT_SUFFIX}`);

            if (!currentStateId) {
                return { pieces: [] }; // Default empty state
            }

            // Find this state in the sorted set
            const stateKey = `${GAME_PREFIX}${gameId}${GAME_STATES_SUFFIX}`;
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
            await redis.set(`${GAME_PREFIX}${gameId}${GAME_CURRENT_SUFFIX}`, stateId);

            // Update last_modified in metadata
            const metaKey = `${GAME_PREFIX}${gameId}${GAME_META_SUFFIX}`;
            await redis.hset(metaKey, 'last_modified', new Date().toISOString());

            return true;
        } catch (err) {
            console.error('Error switching game state:', err);
            return false;
        }
    },

    /**
     * Add a piece to the game
     * @param {Object} piece - The piece to add
     * @param {string} [gameId=DEFAULT_GAME_ID] - The game ID
     * @returns {Promise<boolean>} Success indicator
     */
    async addPiece(piece, gameId = DEFAULT_GAME_ID) {
        try {
            const state = await this.getGameState(gameId);
            state.pieces.push(piece);
            const result = await this.saveGameState(state, null, gameId);
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
            const state = await this.getGameState(gameId);
            const pieceIndex = state.pieces.findIndex(p => p.id === pieceId);

            if (pieceIndex === -1) {
                return false;
            }

            state.pieces[pieceIndex] = {
                ...state.pieces[pieceIndex],
                ...updates
            };

            const result = await this.saveGameState(state, null, gameId);
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
            const state = await this.getGameState(gameId);
            state.pieces = state.pieces.filter(p => p.id !== pieceId);
            const result = await this.saveGameState(state, null, gameId);
            return result.success;
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
    },

    /**
     * Get all available games
     * @returns {Promise<Array>} Array of game metadata
     */
    async getGames() {
        try {
            // Get all keys matching the game prefix with meta suffix
            const keys = await redis.keys(`${GAME_PREFIX}*${GAME_META_SUFFIX}`);

            const games = [];
            for (const key of keys) {
                // Extract game ID from key
                const gameId = key.replace(GAME_PREFIX, '').replace(GAME_META_SUFFIX, '');

                // Get metadata
                const metadata = await redis.hgetall(key);

                // Get state count
                const statesKey = `${GAME_PREFIX}${gameId}${GAME_STATES_SUFFIX}`;
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
            const metaKey = `${GAME_PREFIX}${gameId}${GAME_META_SUFFIX}`;
            await redis.hset(metaKey, {
                'name': gameName,
                'created_at': new Date(timestamp).toISOString(),
                'last_modified': new Date(timestamp).toISOString()
            });

            // Create initial empty state
            const initialState = { pieces: [] };
            await this.saveGameState(initialState, 'initial', gameId);

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
    }
};

module.exports = gameService;