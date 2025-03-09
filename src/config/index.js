/**
 * Configuration module for the application
 * 
 * Centralizes all configuration values and environment variables
 */
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

module.exports = {
  // Server config
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Redis config
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // CORS config
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Upload config
  uploads: {
    directory: path.join(__dirname, '..', 'uploads'),
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: /jpeg|jpg|png|gif/
  },
  
  // Static files
  staticFiles: {
    public: path.join(__dirname, '..', '..', 'public'),
    assets: path.join(__dirname, '..', 'uploads')
  }
};