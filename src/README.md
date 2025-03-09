# Board Game Sync - Server Architecture

This document outlines the organization and structure of the server-side codebase.

## Directory Structure

```
src/
├── app.js                 # Express application setup
├── config/                # Configuration settings
│   └── index.js           # Centralized config module
├── controllers/           # Request handlers
│   ├── assetController.js # Asset-related controllers
│   └── gameController.js  # Game-related controllers
├── middleware/            # Express middleware
│   ├── socketIo.js       # Socket.io integration
│   └── upload.js         # File upload middleware
├── routes/                # API routes
│   ├── assets.js          # Asset routes
│   ├── game.js            # Game routes
│   └── index.js           # Main router
├── server.js              # Entry point
├── services/              # Business logic
│   ├── game/              # Game service
│   │   ├── constants/     # Shared constants
│   │   ├── managers/      # Domain-specific managers
│   │   └── index.js       # Unified API
│   └── tokenService.js    # Token authority service
├── socket/                # WebSocket handlers
│   └── handlers.js        # Socket.io event handlers
└── uploads/               # User-uploaded files
```

## Architecture Overview

The application follows a layered architecture with clear separation of concerns:

1. **Presentation Layer**
   - Routes: Define API endpoints and map to controllers
   - Controllers: Handle HTTP requests and responses
   - Socket Handlers: Manage real-time WebSocket events

2. **Business Logic Layer**
   - Services: Implement domain-specific business logic
   - Managers: Handle specific aspects of the domain

3. **Data Layer**
   - Redis: Game state and token persistence

## Module Responsibilities

### Config (`/config`)
Centralizes all configuration values, environment variables, and settings.

### Controllers (`/controllers`)
Handle HTTP requests, validate inputs, and return appropriate responses.

### Middleware (`/middleware`) 
Provide reusable request processing functions:
- `upload.js`: Handles file uploads via multer
- `socketIo.js`: Makes Socket.io available in Express request handlers

### Routes (`/routes`)
Define the API structure and map endpoints to controller functions.

### Services (`/services`)
Implement core business logic:
- Game Service: Manages game state, pieces, and assets
- Token Service: Handles piece authority/locking

### Socket (`/socket`)
Handles real-time WebSocket communication through Socket.io.

## Startup Flow

1. `server.js` initializes the HTTP server and Socket.io
2. `app.js` configures Express and middleware
3. Socket.io is injected into Express via middleware
3. Routes map API endpoints to controllers
4. Controllers use services to perform operations
5. Services implement business logic and data persistence

## Key Design Patterns

1. **Modular Architecture**: Each module has a single responsibility
2. **Dependency Injection**: Services are passed as dependencies
3. **Factory Pattern**: Services construct and return domain objects
4. **Repository Pattern**: Services abstract data access
5. **Middleware Pattern**: For request processing and validation