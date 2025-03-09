/**
 * File upload middleware using multer
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// Ensure upload directory exists
if (!fs.existsSync(config.uploads.directory)) {
  fs.mkdirSync(config.uploads.directory, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploads.directory);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Configure multer upload options
const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxSize },
  fileFilter: (req, file, cb) => {
    // Accept only image files based on mimetype and extension
    const mimetype = config.uploads.allowedTypes.test(file.mimetype);
    const extname = config.uploads.allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

module.exports = upload;