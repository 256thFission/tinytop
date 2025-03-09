/**
 * Asset Manager - Handles game asset operations
 */
const redis = require('../../../utils/redisClient');
const { keys } = require('../constants/redisKeys');

/**
 * Asset management service
 */
const assetManager = {
    /**
     * Register an asset
     * @param {Object} asset - Asset metadata
     * @returns {Promise<boolean>} Success indicator
     */
    async registerAsset(asset) {
        try {
            const assetsData = await redis.get(keys.assets());
            const assets = assetsData ? JSON.parse(assetsData) : [];
            assets.push(asset);
            await redis.set(keys.assets(), JSON.stringify(assets));
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
            const assetsData = await redis.get(keys.assets());
            return assetsData ? JSON.parse(assetsData) : [];
        } catch (err) {
            console.error('Error getting assets:', err);
            return [];
        }
    },
    
    /**
     * Get asset by ID
     * @param {string} assetId - ID of the asset to retrieve
     * @returns {Promise<Object|null>} Asset or null if not found
     */
    async getAssetById(assetId) {
        try {
            const assets = await this.getAssets();
            return assets.find(asset => asset.id === assetId) || null;
        } catch (err) {
            console.error('Error getting asset by ID:', err);
            return null;
        }
    },
    
    /**
     * Remove an asset
     * @param {string} assetId - ID of the asset to remove
     * @returns {Promise<boolean>} Success indicator
     */
    async removeAsset(assetId) {
        try {
            const assetsData = await redis.get(keys.assets());
            const assets = assetsData ? JSON.parse(assetsData) : [];
            
            const filteredAssets = assets.filter(asset => asset.id !== assetId);
            
            if (filteredAssets.length === assets.length) {
                // No asset was removed
                return false;
            }
            
            await redis.set(keys.assets(), JSON.stringify(filteredAssets));
            return true;
        } catch (err) {
            console.error('Error removing asset:', err);
            return false;
        }
    }
};

module.exports = assetManager;