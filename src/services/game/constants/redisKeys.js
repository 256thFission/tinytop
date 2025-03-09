/**
 * Redis key constants for game service
 */

// Key prefixes and suffixes
const GAME_PREFIX = 'game:';
const GAME_STATES_SUFFIX = ':states';
const GAME_META_SUFFIX = ':meta';
const GAME_CURRENT_SUFFIX = ':current';
const ASSETS_KEY = 'game:assets';

// Default game ID (for backward compatibility)
const DEFAULT_GAME_ID = 'default';

/**
 * Helper functions for constructing Redis keys
 */
const keys = {
  statesKey: (gameId) => `${GAME_PREFIX}${gameId}${GAME_STATES_SUFFIX}`,
  metaKey: (gameId) => `${GAME_PREFIX}${gameId}${GAME_META_SUFFIX}`,
  currentKey: (gameId) => `${GAME_PREFIX}${gameId}${GAME_CURRENT_SUFFIX}`,
  assets: () => ASSETS_KEY
};

module.exports = {
  GAME_PREFIX,
  GAME_STATES_SUFFIX,
  GAME_META_SUFFIX,
  GAME_CURRENT_SUFFIX,
  ASSETS_KEY,
  DEFAULT_GAME_ID,
  keys
};