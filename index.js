/**
 * Main server entry point for the minigame application
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
    methods: ['GET', 'POST']
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Serve static files from uploads directory
app.use('/assets', express.static(path.join(__dirname, 'uploads')));



// Schedule room cleanup every hour
setInterval(() => {
  dataStore.cleanupExpiredRooms();
}, 60 * 60 * 1000);

// Token authority system (in-memory for simplicity)
const tokenAuthority = {
  tokens: {},
  
  // Grant token for a piece to a specific player
  grantToken(pieceId, playerId) {
    this.tokens[pieceId] = {
      owner: playerId,
      timestamp: Date.now()
    };
    return true;
  },
  
  // Check if player has authority over piece
  hasAuthority(pieceId, playerId) {
    const token = this.tokens[pieceId];
    if (!token) return false;
    
    // Token expires after 30 seconds
    if (Date.now() - token.timestamp > 30000) {
      delete this.tokens[pieceId];
      return false;
    }
    
    return token.owner === playerId;
  },
  
  // Release token
  releaseToken(pieceId, playerId) {
    const token = this.tokens[pieceId];
    if (!token || token.owner !== playerId) return false;
    
    delete this.tokens[pieceId];
    return true;
  }
};

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Create or join a game room
app.post('/api/rooms', (req, res) => {
  try {
    const { roomCode } = req.body;
    
    if (!roomCode) {
      return res.status(400).json({ error: 'Room code is required' });
    }
    
    // Find existing room or create a new one
    let game = dataStore.getRoom(roomCode);
    
    if (!game) {
      game = {
        roomCode,
        pieces: [],
        createdAt: new Date().toISOString()
      };
      dataStore.saveRoom(game);
    }
    
    res.json({ 
      success: true, 
      roomCode: game.roomCode, 
      pieceCount: game.pieces.length 
    });
  } catch (err) {
    console.error('Error creating/joining room:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload asset
app.post('/api/assets/upload', upload.single('asset'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Save asset metadata to file store
    const asset = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };
    
    dataStore.addAsset(asset);
    
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
});

// Get all assets
app.get('/api/assets', (req, res) => {
  try {
    const assets = dataStore.getAssets();
    
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
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  let currentRoom = null;
  
  // Handle joining a room
  socket.on('join-room', (roomCode) => {
    try {
      if (!roomCode) {
        socket.emit('error', 'Room code is required');
        return;
      }
      
      // Leave current room if already in one
      if (currentRoom) {
        socket.leave(currentRoom);
      }
      
      // Join new room
      socket.join(roomCode);
      currentRoom = roomCode;
      
      // Get game state from file store
      const game = dataStore.getRoom(roomCode);
      
      if (!game) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      // Send game state to client
      socket.emit('game-state', {
        roomCode: game.roomCode,
        pieces: game.pieces
      });
      
      // Notify other players that someone joined
      socket.to(roomCode).emit('player-joined', {
        playerId: socket.id
      });
    } catch (err) {
      console.error('Error joining room:', err);
      socket.emit('error', 'Failed to join room');
    }
  });
  
  // Request token for a piece
  socket.on('request-token', (pieceId) => {
    if (!currentRoom) {
      socket.emit('error', 'Not in a room');
      return;
    }
    
    const granted = tokenAuthority.grantToken(pieceId, socket.id);
    
    if (granted) {
      socket.emit('token-granted', pieceId);
      socket.to(currentRoom).emit('piece-locked', {
        pieceId,
        playerId: socket.id
      });
    } else {
      socket.emit('token-denied', pieceId);
    }
  });
  
  // Release token for a piece
  socket.on('release-token', (pieceId) => {
    if (!currentRoom) {
      socket.emit('error', 'Not in a room');
      return;
    }
    
    const released = tokenAuthority.releaseToken(pieceId, socket.id);
    
    if (released) {
      socket.to(currentRoom).emit('piece-unlocked', {
        pieceId
      });
    }
  });
  
  // Move a piece
  socket.on('move-piece', (data) => {
    try {
      const { pieceId, x, y } = data;
      
      if (!currentRoom) {
        socket.emit('error', 'Not in a room');
        return;
      }
      
      // Check if player has authority to move this piece
      if (!tokenAuthority.hasAuthority(pieceId, socket.id)) {
        socket.emit('error', 'No authority to move this piece');
        return;
      }
      
      // Update piece position in file store
      const game = dataStore.getRoom(currentRoom);
      
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      const pieceIndex = game.pieces.findIndex(p => p.id === pieceId);
      
      if (pieceIndex === -1) {
        // Piece doesn't exist yet, add it
        game.pieces.push({
          id: pieceId,
          x,
          y,
          assetUrl: data.assetUrl,
          owner: socket.id
        });
      } else {
        // Update existing piece
        game.pieces[pieceIndex].x = x;
        game.pieces[pieceIndex].y = y;
      }
      
      dataStore.saveRoom(game);
      
      // Broadcast move to all clients in room
      io.to(currentRoom).emit('piece-moved', {
        pieceId,
        x,
        y,
        playerId: socket.id
      });
    } catch (err) {
      console.error('Error moving piece:', err);
      socket.emit('error', 'Failed to move piece');
    }
  });
  
  // Add piece to board
  socket.on('add-piece', (data) => {
    try {
      const { pieceId, assetUrl, x, y } = data;
      
      if (!currentRoom) {
        socket.emit('error', 'Not in a room');
        return;
      }
      
      // Update piece position in file store
      const game = dataStore.getRoom(currentRoom);
      
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      // Add new piece
      game.pieces.push({
        id: pieceId,
        x,
        y,
        assetUrl,
        owner: socket.id
      });
      
      dataStore.saveRoom(game);
      
      // Automatically grant token to creator
      tokenAuthority.grantToken(pieceId, socket.id);
      
      // Broadcast new piece to all clients in room
      io.to(currentRoom).emit('piece-added', {
        pieceId,
        x,
        y,
        assetUrl,
        playerId: socket.id
      });
    } catch (err) {
      console.error('Error adding piece:', err);
      socket.emit('error', 'Failed to add piece');
    }
  });
  
  // Remove piece from board
  socket.on('remove-piece', (pieceId) => {
    try {
      if (!currentRoom) {
        socket.emit('error', 'Not in a room');
        return;
      }
      
      // Check if player has authority to remove this piece
      if (!tokenAuthority.hasAuthority(pieceId, socket.id)) {
        socket.emit('error', 'No authority to remove this piece');
        return;
      }
      
      // Update file store
      const game = dataStore.getRoom(currentRoom);
      
      if (!game) {
        socket.emit('error', 'Game not found');
        return;
      }
      
      game.pieces = game.pieces.filter(p => p.id !== pieceId);
      dataStore.saveRoom(game);
      
      // Release token
      tokenAuthority.releaseToken(pieceId, socket.id);
      
      // Broadcast removal to all clients in room
      io.to(currentRoom).emit('piece-removed', {
        pieceId,
        playerId: socket.id
      });
    } catch (err) {
      console.error('Error removing piece:', err);
      socket.emit('error', 'Failed to remove piece');
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Release all tokens held by this player
    Object.keys(tokenAuthority.tokens).forEach(pieceId => {
      if (tokenAuthority.tokens[pieceId].owner === socket.id) {
        tokenAuthority.releaseToken(pieceId, socket.id);
        
        if (currentRoom) {
          io.to(currentRoom).emit('piece-unlocked', {
            pieceId
          });
        }
      }
    });
    
    // Notify other players in the room
    if (currentRoom) {
      socket.to(currentRoom).emit('player-left', {
        playerId: socket.id
      });
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;

// Create initial assets.json file if it doesn't exist
const assetsFile = path.join(dataDir, 'assets.json');
if (!fs.existsSync(assetsFile)) {
  fs.writeFileSync(assetsFile, JSON.stringify([], null, 2), 'utf8');
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});