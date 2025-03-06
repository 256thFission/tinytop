# Minigame

A web application that lets players interact and upload assets in a shared 2D board game space. The core functionality is a board that loads pieces and allows players to move them around in real time using an authority token based movement system.

## Features

- Real-time game board interaction via WebSockets
- Upload and manage custom game assets
- Token-based authority system for piece movement
- Room-based multiplayer with simple codes
- File-based persistence for game state and assets

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy the example environment file:
   ```
   cp .env.example .env
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Docker Deployment

### Building the Docker image

```
docker build -t minigame .
```

### Running the container

```
docker run -p 3000:3000 -v minigame-data:/usr/src/app/data -v minigame-uploads:/usr/src/app/uploads minigame
```

This maps port 3000 and creates persistent volumes for the data and uploads directories.

### Deploying to EC2

1. Set up an EC2 instance with Docker installed
2. Upload your Docker image to a registry or build it directly on the instance
3. Run the container using the command above
4. Configure security groups to allow traffic on port 3000 (or map to 80/443 with a reverse proxy)

## API Endpoints

### Game Rooms

- `POST /api/rooms` - Create or join a game room
  - Body: `{ "roomCode": "your-room-code" }`

### Assets

- `POST /api/assets/upload` - Upload a new asset (multipart/form-data)
  - Form field: `asset` (file upload)
- `GET /api/assets` - Get all available assets

### WebSocket Events

#### Client -> Server

- `join-room` - Join a game room
- `request-token` - Request authority for a piece
- `release-token` - Release authority for a piece
- `move-piece` - Move a piece on the board
- `add-piece` - Add a new piece to the board
- `remove-piece` - Remove a piece from the board

#### Server -> Client

- `game-state` - Full game state on room join
- `piece-locked` - A piece has been locked by a player
- `piece-unlocked` - A piece has been unlocked
- `piece-moved` - A piece has been moved
- `piece-added` - A new piece has been added
- `piece-removed` - A piece has been removed
- `player-joined` - A new player joined the room
- `player-left` - A player left the room
- `error` - Error message