/**
 * Socket.io event handlers
 */
const gameService = require('../services/game');
const tokenService = require('../services/tokenService');

/**
 * Setup socket handlers
 * @param {Object} io - Socket.io server instance
 */
const setupSocketHandlers = (io) => {
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

    // Broadcast piece dragging in real-time
    socket.on('drag-piece', async (data) => {
      try {
        const { pieceId, x, y } = data;

        // Check if player has authority to move this piece
        const hasAuthority = await tokenService.hasAuthority(pieceId, socket.id);

        if (!hasAuthority) {
          return; // Silently fail for drag events to avoid flooding errors
        }

        // Broadcast drag to all clients except the sender
        socket.broadcast.emit('piece-dragged', {
          pieceId,
          x,
          y,
          playerId: socket.id
        });
      } catch (err) {
        console.error('Error broadcasting drag:', err);
        // Don't send error to client to avoid overwhelming during frequent drag events
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
        for (const piece of gameState.pieces) {
          if (await tokenService.hasAuthority(piece.id, socket.id)) {
            await tokenService.releaseToken(piece.id, socket.id);

            io.emit('piece-unlocked', {
              pieceId: piece.id
            });
          }
        }

        // Notify other players
        socket.broadcast.emit('player-left', {
          playerId: socket.id
        });
      } catch (err) {
        console.error('Error handling disconnection:', err);
      }
    });
  });
};

module.exports = setupSocketHandlers;