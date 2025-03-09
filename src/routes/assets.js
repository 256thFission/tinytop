/**
 * Asset routes
 */
const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const upload = require('../middleware/upload');

// Get all assets
router.get('/', assetController.getAllAssets);

// Upload a new asset
router.post('/upload', upload.single('asset'), assetController.uploadAsset);

// Get asset by ID
router.get('/:id', assetController.getAssetById);

// Delete asset
router.delete('/:id', assetController.deleteAsset);

module.exports = router;