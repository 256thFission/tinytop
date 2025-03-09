// Main JavaScript for Simple Game Board Frontend

// Configuration
const API_URL = 'http://localhost:3000'; // Change to your server URL in production
let socket;
let selectedAsset = null;
let selectedPiece = null;
let playerCount = 0;
let clientId = null;
let saveGameModal = null;
let loadStateModal = null;
let pieces = {};


// DOM Elements
const gameBoard = document.getElementById('game-board');
const uploadForm = document.getElementById('upload-form');
const assetUpload = document.getElementById('asset-upload');
const assetList = document.getElementById('asset-list');
const playerCountDisplay = document.getElementById('player-count');
const btnClear = document.getElementById('btn-clear');
const btnRefresh = document.getElementById('btn-refresh');
const statusIndicator = document.getElementById('status-indicator');
const connectionStatus = document.getElementById('connection-status');
const statusMessage = document.getElementById('status-message');




let lastDragUpdate = 0;
const DRAG_THROTTLE = 50; // milliseconds between drag updates

// Add this function to main.js (outside of any other function)
function sendDragUpdate(pieceId, x, y) {
  const now = Date.now();

  // Only send updates at most every DRAG_THROTTLE milliseconds
  if (now - lastDragUpdate >= DRAG_THROTTLE) {
    lastDragUpdate = now;

    // Check if socket is connected and we have a valid piece
    if (socket && socket.connected && pieces[pieceId]) {
      socket.emit('drag-piece', {
        pieceId,
        x,
        y
      });
    }
  }
}

// Initialize the game
init();

async function init() {
  try {
    // Connect to Socket.io server
    await connectSocket();

    // Load available assets
    await loadAssets();

    // Add event listeners
    addEventListeners();

    // Initialize modals
    initModals();

    // Request initial game state
    socket.emit('get-game-state');
  } catch (error) {
    console.error('Initialization error:', error);
    showStatusMessage('Failed to initialize game. Please refresh the page.', 'danger');
  }
}


function initModals() {
  saveGameModal = new bootstrap.Modal(document.getElementById('saveGameModal'));
  loadStateModal = new bootstrap.Modal(document.getElementById('loadStateModal'));

  // Setup save button handler in modal
  document.getElementById('btn-save-confirm').addEventListener('click', () => {
    const saveName = document.getElementById('save-name').value.trim();
    saveGameWithName(saveName);
    saveGameModal.hide();
  });
}

// Initialize the save dialog
function showSaveDialog() {
  // Generate a default name based on date/time
  const defaultName = `Game ${new Date().toLocaleString().replace(/[\/,:]/g, '-')}`;
  document.getElementById('save-name').value = defaultName;

  // Show the modal
  saveGameModal.show();
}

// Save the game with the provided name
async function saveGameWithName(saveName) {
  try {
    showStatusMessage('Saving game...', 'info');

    // Use the provided name or generate a timestamp-based one
    const name = saveName || `Game_${new Date().toISOString().replace(/[:.]/g, '-')}`;

    const response = await fetch(`${API_URL}/api/game/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        clientId
      })
    });

    const data = await response.json();

    if (data.success) {
      showStatusMessage(`Game saved successfully as: ${data.name}`, 'success', 5000);
    } else {
      console.error('Failed to save game:', data.error);
      showStatusMessage(`Failed to save game: ${data.error}`, 'danger');
    }
  } catch (error) {
    console.error('Error saving game:', error);
    showStatusMessage('Error saving game. Please try again.', 'danger');
  }
}

// Load and display the list of saved states
async function loadSavedStatesList() {
  try {
    const response = await fetch(`${API_URL}/api/game/states`);
    const data = await response.json();

    const statesList = document.getElementById('saved-states-list');

    if (data.success && data.states && data.states.length > 0) {
      statesList.innerHTML = '';

      data.states.forEach(state => {
        const row = document.createElement('tr');

        // Format the date
        const savedDate = new Date(state.savedAt);
        const formattedDate = savedDate.toLocaleString();

        row.innerHTML = `
          <td>${state.name || 'Unnamed State'}</td>
          <td>${formattedDate}</td>
          <td>
            <button class="btn btn-sm btn-primary load-state-btn" data-state-id="${state.id}">
              Load
            </button>
          </td>
        `;

        statesList.appendChild(row);
      });

      // Add event listeners to load buttons
      document.querySelectorAll('.load-state-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const stateId = e.target.dataset.stateId;
          loadGameState(stateId);
          loadStateModal.hide();
        });
      });
    } else {
      statesList.innerHTML = '<tr><td colspan="3" class="text-center">No saved states found</td></tr>';
    }
  } catch (error) {
    console.error('Error loading saved states:', error);
    const statesList = document.getElementById('saved-states-list');
    statesList.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error loading saved states</td></tr>';
  }
}

// Load a specific game state
async function loadGameState(stateId) {
  try {
    showStatusMessage('Loading game state...', 'info');

    const response = await fetch(`${API_URL}/api/game/load-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stateId,
        clientId
      })
    });

    const data = await response.json();

    if (data.success) {
      showStatusMessage('Game state loaded successfully', 'success', 3000);
    } else {
      console.error('Failed to load game state:', data.error);
      showStatusMessage(`Failed to load game state: ${data.error}`, 'danger');
    }
  } catch (error) {
    console.error('Error loading game state:', error);
    showStatusMessage('Error loading game state. Please try again.', 'danger');
  }
}

// Show the load state dialog
function showLoadStateDialog() {
  loadSavedStatesList();
  loadStateModal.show();
}




// Connect to the WebSocket server
async function connectSocket() {
  return new Promise((resolve, reject) => {
    try {
      socket = io(API_URL);

      socket.on('connect', () => {
        console.log('Connected to server with ID:', socket.id);
        clientId = socket.id;
        updateConnectionStatus(true);
        resolve();
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        updateConnectionStatus(false);
        reject(error);
      });

      // Setup all socket event listeners
      setupSocketEvents();
    } catch (error) {
      console.error('Failed to connect to Socket.io server:', error);
      updateConnectionStatus(false);
      reject(error);
    }
  });
}

// Update connection status indicator
function updateConnectionStatus(isConnected) {
  if (isConnected) {
    statusIndicator.classList.add('connected');
    connectionStatus.textContent = 'Connected';
  } else {
    statusIndicator.classList.remove('connected');
    connectionStatus.textContent = 'Disconnected';
  }
}

// Setup all socket event listeners
function setupSocketEvents() {
  // When receiving game state
  socket.on('game-state', (data) => {
    console.log('Received game state:', data);
    pieces = {};
    gameBoard.innerHTML = '';

    if (data.pieces && Array.isArray(data.pieces)) {
      data.pieces.forEach(piece => {
        addPieceToBoard(piece.id, piece.assetUrl, piece.x, piece.y, piece.owner);
      });
      showStatusMessage(`Game board loaded with ${data.pieces.length} pieces`, 'info', 3000);
    }
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

  // When a token is granted
  socket.on('token-granted', (pieceId) => {
    console.log('Token granted for piece:', pieceId);
  });

  // When a token is denied
  socket.on('token-denied', (pieceId) => {
    console.log('Token denied for piece:', pieceId);
    showStatusMessage('Cannot interact with this piece right now', 'warning', 3000);
  });

  // When a piece is moved by another player
  socket.on('piece-moved', (data) => {
    console.log('Piece moved:', data);
    if (data.playerId !== clientId && pieces[data.pieceId]) {
      movePiece(pieces[data.pieceId].element, data.x, data.y);
    }
  });

  socket.on('piece-dragged', (data) => {
    // Only update pieces moved by other players, not our own movements
    if (data.playerId !== clientId && pieces[data.pieceId]) {
      // Use a smooth transition for drag updates
      const pieceElement = pieces[data.pieceId].element;
      pieceElement.style.transition = 'transform 0.1s ease-out';
      movePiece(pieceElement, data.x, data.y);

      // Remove the transition after it completes to allow for crisp movement
      setTimeout(() => {
        pieceElement.style.transition = '';
      }, 100);
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

  // When player count updates
  socket.on('player-joined', (data) => {
    playerCount++;
    updatePlayerCount();
    showStatusMessage(`Player ${data.playerId} joined`, 'info', 3000);
  });

  socket.on('player-left', (data) => {
    playerCount = Math.max(0, playerCount - 1);
    updatePlayerCount();
  });

  // When an error occurs
  socket.on('error', (message) => {
    console.error('Server error:', message);
    showStatusMessage(`Error: ${message}`, 'danger');
  });

  socket.on('game-state-loaded', (data) => {
    console.log('Game state loaded:', data);

    // If it wasn't loaded by us, show a notification
    if (data.loadedBy !== clientId) {
      showStatusMessage(`Game state was loaded by another player`, 'info', 3000);
    }
  });

  socket.on('game-saved', (data) => {
    console.log('Game saved:', data);

    // Only show notification if it wasn't saved by this client
    if (data.savedBy !== clientId) {
      showStatusMessage(`Game was saved as: ${data.name}`, 'info', 3000);
    }
  });

    // Handle reconnection
  socket.on('reconnect', () => {
    console.log('Reconnected to server');
    clientId = socket.id; // Update client ID on reconnection
    updateConnectionStatus(true);

    // Request fresh game state
    socket.emit('get-game-state');
  });
}

// Add all event listeners
function addEventListeners() {
  // Asset upload form
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (assetUpload.files.length > 0) {
      await uploadAsset(assetUpload.files[0]);
      assetUpload.value = '';
    } else {
      showStatusMessage('Please select a file to upload', 'warning', 3000);
    }
  });

  // Game board click (for adding pieces)
  gameBoard.addEventListener('click', (e) => {
    if (selectedAsset && e.target === gameBoard) {
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


  // Refresh board button
  btnRefresh.addEventListener('click', () => {
    socket.emit('get-game-state');
    showStatusMessage('Refreshing game board...', 'info', 2000);
  });

  // Save game button
  document.getElementById('btn-save').addEventListener('click', () => {
    showSaveDialog();
  });

  // Load state button
  document.getElementById('btn-load').addEventListener('click', () => {
    showLoadStateDialog();
  });
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
      showStatusMessage('Failed to load assets', 'warning');
    }
  } catch (error) {
    console.error('Error loading assets:', error);
    showStatusMessage('Error loading assets. Server might be down.', 'danger');
  }
}

// Upload a new asset
async function uploadAsset(file) {
  try {
    showStatusMessage('Uploading asset...', 'info');

    const formData = new FormData();
    formData.append('asset', file);

    const response = await fetch(`${API_URL}/api/assets/upload`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      console.log('Asset uploaded successfully:', data.asset);
      showStatusMessage('Asset uploaded successfully', 'success', 3000);
      await loadAssets(); // Reload asset list
    } else {
      console.error('Failed to upload asset:', data.error);
      showStatusMessage(`Failed to upload asset: ${data.error}`, 'danger');
    }
  } catch (error) {
    console.error('Error uploading asset:', error);
    showStatusMessage('Error uploading asset. Please try again.', 'danger');
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
      showStatusMessage('Asset selected. Click on the board to place it.', 'info', 3000);
    });

    assetList.appendChild(assetItem);
  });
}

// Add a new piece to the board
function addNewPiece(asset, x, y) {
  if (!socket.connected) {
    showStatusMessage('Not connected to server. Cannot add piece.', 'warning');
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
  // Create the piece element
  const pieceElement = document.createElement('div');
  pieceElement.className = 'piece';
  pieceElement.dataset.pieceId = pieceId;

  // Create the image
  const img = document.createElement('img');
  img.src = `${API_URL}${assetUrl}`;
  img.alt = "Game piece";
  img.draggable = false; // Prevent default image drag behavior

  // Add image to piece
  pieceElement.appendChild(img);

  // Set initial position
  pieceElement.style.left = `${x}px`;
  pieceElement.style.top = `${y}px`;

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

  // Log success
  console.log(`Piece added: ${pieceId} at position (${x}, ${y})`);

  return pieceElement;
}

// Make an element draggable
function makeElementDraggable(element) {
  let isDragging = false;
  let startX, startY, initialX, initialY;

  element.addEventListener('mousedown', startDrag);
  element.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    e.preventDefault();
    e.stopPropagation(); // Stop click from propagating to board

    const pieceId = element.dataset.pieceId;

    // Check if socket is connected
    if (!socket.connected) {
      showStatusMessage('Not connected to server. Cannot move piece.', 'warning');
      return;
    }

    // Check if piece is already locked
    if (pieces[pieceId] && pieces[pieceId].locked) {
      showStatusMessage('This piece is currently being moved by another player', 'warning', 2000);
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

    // Get current position (already set in the style)
    initialX = parseInt(element.style.left) || 0;
    initialY = parseInt(element.style.top) || 0;

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

    // Set new position directly
    const newX = initialX + dx;
    const newY = initialY + dy;
    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;

    // Send drag updates to server (throttled)
    sendDragUpdate(element.dataset.pieceId, newX, newY);
  }

  function stopDrag(e) {
    if (!isDragging) return;

    // Prevent default behavior
    if (e) {
      e.preventDefault();
    }

    isDragging = false;

    // Remove dragging class
    element.classList.remove('dragging');

    // Remove document-level event listeners
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchend', stopDrag);

    const pieceId = element.dataset.pieceId;

    // Send final position to server to persist the change
    if (pieces[pieceId] && socket.connected) {
      const x = parseInt(element.style.left) || 0;
      const y = parseInt(element.style.top) || 0;

      // Send to server (this persists the position)
      socket.emit('move-piece', {
        pieceId,
        x,
        y
      });

      // Release token
      socket.emit('release-token', pieceId);
    }
  }
}

// Move a piece to a specific position
function movePiece(element, x, y) {
  // Set the position of the piece
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;

  // Also update our local piece state if this piece is in our pieces object
  const pieceId = element.dataset.pieceId;
  if (pieces[pieceId]) {
    pieces[pieceId].x = x;
    pieces[pieceId].y = y;
  }
}

// Update the player count display
function updatePlayerCount() {
  playerCountDisplay.textContent = playerCount.toString();
}

// Show a status message
function showStatusMessage(message, type = 'info', timeout = 0) {
  statusMessage.textContent = message;
  statusMessage.className = `alert alert-${type} mt-3`;
  statusMessage.style.display = 'block';

  if (timeout > 0) {
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, timeout);
  }
}

// Clear asset and piece selection
function clearSelection() {
  selectedAsset = null;
  selectedPiece = null;

  document.querySelectorAll('.asset-item.active').forEach(item => {
    item.classList.remove('active');
  });

  showStatusMessage('Selection cleared', 'info', 2000);
}