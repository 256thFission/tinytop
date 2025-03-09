/**
 * Main application entry point
 * 
 * Initializes HTTP server and Socket.IO
 */
const http = require('http');
const socketIo = require('socket.io');
const config = require('./config');
const { app, initializeApp } = require('./app');
const setupSocketHandlers = require('./socket/handlers');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

// Initialize the app with Socket.io
initializeApp(io);

// Set up socket event handlers
setupSocketHandlers(io);

// Start server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`CORS configured for: ${config.corsOrigin}`);
});