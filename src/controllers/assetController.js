/**
 * Asset Controller
 * 
 * Handles HTTP requests related to game assets
 */
const { v4: uuidv4 } = require('uuid');
const gameService = require('../services/game');

/**
 * Upload a new asset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.uploadAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Register asset metadata
    const asset = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };

    await gameService.registerAsset(asset);

    res.json({
      success: true,
      asset: {
        id: asset.id,
        filename: asset.filename,
        url: `/assets/${asset.filename}`
      }
    });
  } catch (err) {
    console.error('Error uploading asset:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all assets
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllAssets = async (req, res) => {
  try {
    const assets = await gameService.getAssets();

    // Sort by uploadedAt in descending order
    assets.sort((a, b) => {
      return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    });

    res.json({
      success: true,
      assets: assets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        originalName: asset.originalName,
        url: `/assets/${asset.filename}`,
        uploadedAt: asset.uploadedAt
      }))
    });
  } catch (err) {
    console.error('Error fetching assets:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get asset by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await gameService.getAssetById(id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    res.json({
      success: true,
      asset: {
        id: asset.id,
        filename: asset.filename,
        originalName: asset.originalName,
        url: `/assets/${asset.filename}`,
        uploadedAt: asset.uploadedAt
      }
    });
  } catch (err) {
    console.error('Error fetching asset:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Delete asset by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await gameService.removeAsset(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Asset not found or could not be deleted' });
    }
    
    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting asset:', err);
    res.status(500).json({ error: 'Server error' });
  }
};