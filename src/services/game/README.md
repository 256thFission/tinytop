# Game Service Module

This module provides a complete API for managing multiplayer board game state with Redis-based persistence.

## Architecture

The Game Service follows a modular, domain-driven design with the following components:

### Constants

- `redisKeys.js`: Defines Redis key patterns and helper functions for key construction

### Managers

- `stateManager.js`: Handles game state persistence and retrieval
- `pieceManager.js`: Manages game pieces (add, update, remove)
- `assetManager.js`: Manages game assets (register, retrieve)
- `gameManager.js`: Handles game creation and metadata

### API

The main `index.js` file unifies all managers into a single cohesive API.

## Usage

```javascript
// Import the game service
const gameService = require('./services/game');

// Use state management functions
const gameState = await gameService.getGameState('my-game-id');
await gameService.saveGameState(gameState, 'my-save-name', 'my-game-id');

// Use piece management functions
await gameService.addPiece({ id: 'piece-1', x: 100, y: 200 });
await gameService.updatePiece('piece-1', { x: 150, y: 250 });

// Use asset management functions
await gameService.registerAsset({ id: 'asset-1', url: '/assets/image.png' });
const assets = await gameService.getAssets();

// Use game management functions
await gameService.createGame('My New Game');
const games = await gameService.getGames();
```

## Error Handling

All methods use try/catch blocks for error handling and return appropriate default values or error indicators.

## Key Features

- **State Management**: Save and load game states with versioning
- **Piece Management**: Add, update, remove, and query game pieces
- **Asset Management**: Register and retrieve game assets
- **Game Management**: Create, retrieve, update, and delete games
- **Robust Error Handling**: All operations are wrapped in try/catch for resilience

## Future Improvements

- Add TypeScript type definitions
- Implement pagination for large result sets
- Add more comprehensive validation
- Add unit and integration tests