/**
 * Redis client for the game application
 */
const Redis = require('ioredis');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
const client = new Redis(REDIS_URL);

// Log Redis connection events
client.on('connect', () => {
    console.log('Connected to Redis');
});

client.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// Export the Redis client directly
module.exports = client;