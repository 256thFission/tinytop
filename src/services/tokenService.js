/**
 * Token authority service for controlling piece access
 */
const redis = require('../utils/redisClient');

// Token expiration time in seconds
const TOKEN_EXPIRY = 30;

// Key prefix for tokens
const TOKEN_KEY_PREFIX = 'token:';

const tokenService = {
    /**
     * Grant token for a piece to a player
     * @param {string} pieceId - The piece ID
     * @param {string} playerId - The player ID
     * @returns {Promise<boolean>} Success indicator
     */
    async grantToken(pieceId, playerId) {
        try {
            const tokenKey = `${TOKEN_KEY_PREFIX}${pieceId}`;

            // Set token with expiration
            await redis.set(tokenKey, playerId, 'EX', TOKEN_EXPIRY);
            return true;
        } catch (err) {
            console.error('Error granting token:', err);
            return false;
        }
    },

    /**
     * Check if player has authority over a piece
     * @param {string} pieceId - The piece ID
     * @param {string} playerId - The player ID
     * @returns {Promise<boolean>} True if player has authority
     */
    async hasAuthority(pieceId, playerId) {
        try {
            const tokenKey = `${TOKEN_KEY_PREFIX}${pieceId}`;
            const tokenOwner = await redis.get(tokenKey);

            return tokenOwner === playerId;
        } catch (err) {
            console.error('Error checking token authority:', err);
            return false;
        }
    },

    /**
     * Release a token
     * @param {string} pieceId - The piece ID
     * @param {string} playerId - The player ID
     * @returns {Promise<boolean>} Success indicator
     */
    async releaseToken(pieceId, playerId) {
        try {
            const tokenKey = `${TOKEN_KEY_PREFIX}${pieceId}`;
            const tokenOwner = await redis.get(tokenKey);

            if (tokenOwner !== playerId) {
                return false;
            }

            await redis.del(tokenKey);
            return true;
        } catch (err) {
            console.error('Error releasing token:', err);
            return false;
        }
    }
};

module.exports = tokenService;