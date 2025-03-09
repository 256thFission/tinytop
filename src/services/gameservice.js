/**
 * Game service with Redis-based storage for multiple game states
 * 
 * NOTE: This is a legacy adapter module that re-exports the newer modular game service.
 * New code should import directly from './game' instead.
 */

// Import the modular service implementation
const gameService = require('./game');

// Re-export for backward compatibility
module.exports = gameService;