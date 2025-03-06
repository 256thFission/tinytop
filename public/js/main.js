// Main JavaScript for Minigame Frontend

// Configuration
const API_URL = 'http://localhost:3000'; // Change to your server URL in production
let socket;
let currentRoom = null;
let selectedAsset = null;
let selectedPiece = null;
let playerCount = 0;
let clientId = null;
let pieces = {};
let isRejoining = false; // Flag to track if we're currently rejoining a room

// DOM Elements
const gameBoard = document.getElementById('game-board');
const roomCodeInput = document.getElementById('room-code');
const roomForm = document.getElementById('room-form');
const uploadForm = document.getElementById('upload-form');
const assetUpload = document.getElementById('asset-upload');
const assetList = document.getElementById('asset-list');
const roomCodeDisplay = document.getElementById('room-code-display');
const playerCountDisplay = document.getElementById('player-count');
const btnClear = document.getElementById('btn-clear');

// Initialize the game
init();

async function init() {
  // Connect to Socket.io server
  await connectSocket();
  
  // Load available assets
  await loadAssets();
  
  // Add event listeners
  addEventListeners();
}

// Connect to the WebSocket server
async function connectSocket() {
  return new Promise((resolve, reject) => {
    try {
      socket = io(API_URL);
      
      socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        clientId = socket.id;
        resolve();
      });
      
      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });
      
      // Setup all socket event listeners
      setupSocketEvents();
    } catch (error) {
      console.error('Failed to connect to Socket.io server:', error);
      reject(error);
    }
  });
}

// Setup all socket event listeners
function setupSocketEvents() {
  // When receiving game state
  socket.on('game-state', (data) => {
    console.log('Received game state:', data);
    pieces = {};
    gameBoard.innerHTML = '';
    
    data.pieces.forEach(piece => {
      addPieceToBoard(piece.id, piece.assetUrl, piece.x, piece.y, piece.owner);
    });
  });
  
  // When a player joins
  socket.on('player-joined', (data) => {
    console.log('Player joined:', data.playerId);
    playerCount++;
    updatePlayerCount();
  });
  
  // When a player leaves
  socket.on('player-left', (data) => {
    console.log('Player left:', data.playerId);
    playerCount = Math.max(0, playerCount - 1);
    updatePlayerCount();
  });
  
  // When a piece is locked by another player
  socket.on('piece-locked', (data) => {
    console.log('Piece locked:', data);
    if (pieces[data.pieceId]) {
      pieces[data.pieceId].locked = true;
      pieces[data.pieceId].element.classList.add('locked');
    }
  });
  
  // When a piece is unlocked
  socket.on('piece-unlocked', (data) => {
    console.log('Piece unlocked:', data);
    if (pieces[data.pieceId]) {
      pieces[data.pieceId].locked = false;
      pieces[data.pieceId].element.classList.remove('locked');
    }
  });
  
  // When a piece is moved by another player
  socket.on('piece-moved', (data) => {
    console.log('Piece moved:', data);
    if (data.playerId !== clientId && pieces[data.pieceId]) {
      movePiece(pieces[data.pieceId].element, data.x, data.y);
    }
  });
  
  // When a new piece is added
  socket.on('piece-added', (data) => {
    console.log('Piece added:', data);
    if (data.playerId !== clientId) {
      addPieceToBoard(data.pieceId, data.assetUrl, data.x, data.y, data.playerId);
    }
  });
  
  // When a piece is removed
  socket.on('piece-removed', (data) => {
    console.log('Piece removed:', data);
    if (pieces[data.pieceId]) {
      gameBoard.removeChild(pieces[data.pieceId].element);
      delete pieces[data.pieceId];
    }
  });
  
  // When an error occurs
  socket.on('error', (message) => {
    console.error('Server error:', message);
    alert(`Error: ${message}`);
  });
  
  // Handle reconnection
  socket.on('reconnect', () => {
    console.log('Reconnected to server');
    clientId = socket.id; // Update client ID on reconnection
    
    // If we were in a room before, rejoin it
    if (currentRoom) {
      console.log(`Rejoining room: ${currentRoom}`);
      isRejoining = true;
      
      // Set up a one-time game-state listener to know when rejoining is complete
      const gameStateHandler = (data) => {
        console.log('Room rejoined successfully');
        isRejoining = false;
        socket.off('game-state', gameStateHandler); // Remove this one-time handler
      };
      
      socket.once('game-state', gameStateHandler);
      
      // Add a timeout in case we never get the game-state event
      setTimeout(() => {
        if (isRejoining) {
          console.log('Room rejoin timed out, resetting flag');
          isRejoining = false;
        }
      }, 5000);
      
      socket.emit('join-room', currentRoom);
    }
  });
}

// Add all event listeners
function addEventListeners() {
  // Room form submission
  roomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomCode = roomCodeInput.value.trim();
    if (roomCode) {
      joinRoom(roomCode);
    }
  });
  
  // Asset upload form
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (assetUpload.files.length > 0) {
      await uploadAsset(assetUpload.files[0]);
      assetUpload.value = '';
    }
  });
  
  // Game board click (for adding pieces)
  gameBoard.addEventListener('click', (e) => {
    if (selectedAsset && currentRoom && e.target === gameBoard) {
      const rect = gameBoard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      addNewPiece(selectedAsset, x, y);
    }
  });
  
  // Clear selection button
  btnClear.addEventListener('click', () => {
    clearSelection();
  });
}

// Join a room
async function joinRoom(roomCode) {
  try {
    // First, create or join the room via API
    const response = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Then connect to the room via WebSocket
      socket.emit('join-room', roomCode);
      currentRoom = roomCode;
      roomCodeDisplay.textContent = roomCode;
      console.log(`Joined room: ${roomCode}`);
    } else {
      console.error('Failed to join room:', data.error);
      alert(`Failed to join room: ${data.error}`);
    }
  } catch (error) {
    console.error('Error joining room:', error);
    alert('Error joining room. Please try again.');
  }
}

// Load available assets
async function loadAssets() {
  try {
    const response = await fetch(`${API_URL}/api/assets`);
    const data = await response.json();
    
    if (data.success) {
      renderAssetList(data.assets);
    } else {
      console.error('Failed to load assets:', data.error);
    }
  } catch (error) {
    console.error('Error loading assets:', error);
  }
}

// Upload a new asset
async function uploadAsset(file) {
  try {
    const formData = new FormData();
    formData.append('asset', file);
    
    const response = await fetch(`${API_URL}/api/assets/upload`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Asset uploaded successfully:', data.asset);
      await loadAssets(); // Reload asset list
    } else {
      console.error('Failed to upload asset:', data.error);
      alert(`Failed to upload asset: ${data.error}`);
    }
  } catch (error) {
    console.error('Error uploading asset:', error);
    alert('Error uploading asset. Please try again.');
  }
}

// Render the asset list
function renderAssetList(assets) {
  assetList.innerHTML = '';
  
  if (assets.length === 0) {
    assetList.innerHTML = '<p class="text-muted">No assets available</p>';
    return;
  }
  
  assets.forEach(asset => {
    const assetItem = document.createElement('div');
    assetItem.className = 'asset-item';
    assetItem.dataset.assetUrl = asset.url;
    assetItem.dataset.assetId = asset.id;
    
    assetItem.innerHTML = `
      <img src="${API_URL}${asset.url}" alt="${asset.originalName || 'Game piece'}">
      <span>${asset.originalName || asset.filename}</span>
    `;
    
    assetItem.addEventListener('click', () => {
      // Deselect any currently selected asset
      document.querySelectorAll('.asset-item.active').forEach(item => {
        item.classList.remove('active');
      });
      
      // Select this asset
      assetItem.classList.add('active');
      selectedAsset = {
        id: asset.id,
        url: asset.url
      };
      
      console.log('Selected asset:', selectedAsset);
    });
    
    assetList.appendChild(assetItem);
  });
}

// Add a new piece to the board
function addNewPiece(asset, x, y) {
  if (!currentRoom) {
    alert('Please join a room first');
    return;
  }
  
  if (isRejoining) {
    console.log('Still rejoining room, please wait...');
    return;
  }
  
  const pieceId = `piece-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const assetUrl = asset.url;
  
  // Add piece locally (will be confirmed by server)
  addPieceToBoard(pieceId, assetUrl, x, y, clientId);
  
  // Send to server
  socket.emit('add-piece', {
    pieceId,
    assetUrl,
    x,
    y
  });
}

// Add a piece to the game board
function addPieceToBoard(pieceId, assetUrl, x, y, owner) {
  const pieceElement = document.createElement('div');
  pieceElement.className = 'piece';
  pieceElement.dataset.pieceId = pieceId;
  pieceElement.innerHTML = `<img src="${API_URL}${assetUrl}" alt="Game piece">`;
  
  // Set position
  movePiece(pieceElement, x, y);
  
  // Add to game board
  gameBoard.appendChild(pieceElement);
  
  // Store piece information
  pieces[pieceId] = {
    id: pieceId,
    element: pieceElement,
    assetUrl,
    owner,
    x,
    y,
    locked: false
  };
  
  // Add drag functionality
  makeElementDraggable(pieceElement);
}

// Make an element draggable
function makeElementDraggable(element) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  element.addEventListener('mousedown', startDrag);
  element.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    e.preventDefault();
    
    const pieceId = element.dataset.pieceId;
    
    // Check if piece is already locked
    if (pieces[pieceId] && pieces[pieceId].locked) {
      return;
    }
    
    // Check if we're still rejoining a room
    if (isRejoining) {
      console.log('Still rejoining room, please wait...');
      return;
    }
    
    // Request authority token for this piece
    socket.emit('request-token', pieceId);
    
    // Setup move tracking
    isDragging = true;
    
    // Get cursor position
    if (e.type === 'touchstart') {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    } else {
      startX = e.clientX;
      startY = e.clientY;
    }
    
    // Get current position
    startLeft = parseInt(element.style.left) || 0;
    startTop = parseInt(element.style.top) || 0;
    
    // Add dragging class
    element.classList.add('dragging');
    
    // Select this piece
    selectedPiece = pieceId;
    
    // Add document-level event listeners
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchend', stopDrag);
  }

  function drag(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    
    let clientX, clientY;
    
    if (e.type === 'touchmove') {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculate new position
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    const newLeft = startLeft + dx;
    const newTop = startTop + dy;
    
    // Move the element
    element.style.left = `${newLeft}px`;
    element.style.top = `${newTop}px`;
  }

  function stopDrag() {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Remove dragging class
    element.classList.remove('dragging');
    
    // Remove document-level event listeners
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);
    
    const pieceId = element.dataset.pieceId;
    
    // Send final position to server
    if (pieces[pieceId]) {
      const x = parseInt(element.style.left) || 0;
      const y = parseInt(element.style.top) || 0;
      
      pieces[pieceId].x = x;
      pieces[pieceId].y = y;
      
      // Check if we're still rejoining a room
      if (!isRejoining) {
        socket.emit('move-piece', {
          pieceId,
          x,
          y
        });
        
        // Release token
        socket.emit('release-token', pieceId);
      } else {
        console.log('Still rejoining room, movement not sent to server');
      }
    }
  }
}

// Move a piece to a specific position
function movePiece(element, x, y) {
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
}

// Update the player count display
function updatePlayerCount() {
  playerCountDisplay.textContent = playerCount.toString();
}

// Clear asset and piece selection
function clearSelection() {
  selectedAsset = null;
  selectedPiece = null;
  
  document.querySelectorAll('.asset-item.active').forEach(item => {
    item.classList.remove('active');
  });
}