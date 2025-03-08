/**
 * Simplified game server with Redis storage
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

// Import services
const gameService = require('./services/gameservice');
const tokenService = require('./services/tokenService');

// Create Express application
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*', // In production, restrict this to your frontend domain
        methods: ['GET', 'POST']
    }
});

// Set up uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

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
app.use('/assets', express.static(uploadsDir));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Get game state
app.get('/api/game', async (req, res) => {
    try {
        const gameState = await gameService.getGameState();
        res.json({
            success: true,
            game: gameState
        });
    } catch (err) {
        console.error('Error getting game state:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Upload asset
app.post('/api/assets/upload', upload.single('asset'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Register asset metadata
        const asset = {
            id: uuidv4(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedAt: new Date().toISOString()
        };

        await gameService.registerAsset(asset);

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
app.get('/api/assets', async (req, res) => {
    try {
        const assets = await gameService.getAssets();

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

    // Send game state to new client
    socket.on('get-game-state', async () => {
        try {
            const gameState = await gameService.getGameState();
            socket.emit('game-state', gameState);
        } catch (err) {
            console.error('Error sending game state:', err);
            socket.emit('error', 'Failed to get game state');
        }
    });

    // Request token for a piece
    socket.on('request-token', async (pieceId) => {
        try {
            const granted = await tokenService.grantToken(pieceId, socket.id);

            if (granted) {
                socket.emit('token-granted', pieceId);
                socket.broadcast.emit('piece-locked', {
                    pieceId,
                    playerId: socket.id
                });
            } else {
                socket.emit('token-denied', pieceId);
            }
        } catch (err) {
            console.error('Error requesting token:', err);
            socket.emit('error', 'Failed to request token');
        }
    });

    // Release token for a piece
    socket.on('release-token', async (pieceId) => {
        try {
            const released = await tokenService.releaseToken(pieceId, socket.id);

            if (released) {
                socket.broadcast.emit('piece-unlocked', {
                    pieceId
                });
            }
        } catch (err) {
            console.error('Error releasing token:', err);
            socket.emit('error', 'Failed to release token');
        }
    });

    // Move a piece
    socket.on('move-piece', async (data) => {
        try {
            const { pieceId, x, y } = data;

            // Check if player has authority to move this piece
            const hasAuthority = await tokenService.hasAuthority(pieceId, socket.id);

            if (!hasAuthority) {
                socket.emit('error', 'No authority to move this piece');
                return;
            }

            // Update piece position
            await gameService.updatePiece(pieceId, { x, y });

            // Broadcast move to all clients
            io.emit('piece-moved', {
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
    socket.on('add-piece', async (data) => {
        try {
            const { pieceId, assetUrl, x, y } = data;

            // Create new piece
            const piece = {
                id: pieceId,
                x,
                y,
                assetUrl,
                owner: socket.id,
                createdAt: new Date().toISOString()
            };

            // Add to game state
            await gameService.addPiece(piece);

            // Automatically grant token to creator
            await tokenService.grantToken(pieceId, socket.id);

            // Broadcast new piece to all clients
            io.emit('piece-added', {
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
    socket.on('remove-piece', async (pieceId) => {
        try {
            // Check if player has authority to remove this piece
            const hasAuthority = await tokenService.hasAuthority(pieceId, socket.id);

            if (!hasAuthority) {
                socket.emit('error', 'No authority to remove this piece');
                return;
            }

            // Remove piece from game state
            await gameService.removePiece(pieceId);

            // Release token
            await tokenService.releaseToken(pieceId, socket.id);

            // Broadcast removal to all clients
            io.emit('piece-removed', {
                pieceId,
                playerId: socket.id
            });
        } catch (err) {
            console.error('Error removing piece:', err);
            socket.emit('error', 'Failed to remove piece');
        }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
        console.log('Client disconnected:', socket.id);

        try {
            // Get game state to find pieces owned by this player
            const gameState = await gameService.getGameState();

            // Look for pieces with tokens held by this player
            gameState.pieces.forEach(async (piece) => {
                if (await tokenService.hasAuthority(piece.id, socket.id)) {
                    await tokenService.releaseToken(piece.id, socket.id);

                    io.emit('piece-unlocked', {
                        pieceId: piece.id
                    });
                }
            });

            // Notify other players
            socket.broadcast.emit('player-left', {
                playerId: socket.id
            });
        } catch (err) {
            console.error('Error handling disconnection:', err);
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});