/**
 * Socket.io middleware for Express
 * 
 * Makes the Socket.io instance available in Express request handlers
 */

// Socket.io middleware factory
const createSocketMiddleware = (io) => {
  return (req, res, next) => {
    req.io = io;
    next();
  };
};

module.exports = createSocketMiddleware;