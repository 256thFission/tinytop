const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

const dataStore = {
    // Get a room by its code
    getRoom(roomCode) {
        const roomFile = path.join(dataDir, `room-${roomCode}.json`);
        if (fs.existsSync(roomFile)) {
            try {
                const data = fs.readFileSync(roomFile, 'utf8');
                return JSON.parse(data);
            } catch (err) {
                console.error(`Error reading room file ${roomFile}:`, err);
                return null;
            }
        }
        return null;
    },

    // Create or update a room
    saveRoom(room) {
        const roomFile = path.join(dataDir, `room-${room.roomCode}.json`);
        try {
            fs.writeFileSync(roomFile, JSON.stringify(room, null, 2), 'utf8');
            return true;
        } catch (err) {
            console.error(`Error writing room file ${roomFile}:`, err);
            return false;
        }
    },

    // Get all assets metadata
    getAssets() {
        const assetsFile = path.join(dataDir, 'assets.json');
        if (fs.existsSync(assetsFile)) {
            try {
                const data = fs.readFileSync(assetsFile, 'utf8');
                return JSON.parse(data);
            } catch (err) {
                console.error(`Error reading assets file:`, err);
                return [];
            }
        }
        return [];
    },

    // Add a new asset
    addAsset(asset) {
        const assets = this.getAssets();
        assets.push(asset);
        const assetsFile = path.join(dataDir, 'assets.json');
        try {
            fs.writeFileSync(assetsFile, JSON.stringify(assets, null, 2), 'utf8');
            return true;
        } catch (err) {
            console.error(`Error writing assets file:`, err);
            return false;
        }
    },

    // Clean up expired rooms (older than 24 hours)
    cleanupExpiredRooms() {
        try {
            const files = fs.readdirSync(dataDir);
            const now = Date.now();
            const expireTime = 24 * 60 * 60 * 1000; // 24 hours

            files.forEach(file => {
                if (file.startsWith('room-') && file.endsWith('.json')) {
                    const filePath = path.join(dataDir, file);
                    const stats = fs.statSync(filePath);

                    // Check if file is older than 24 hours
                    if (now - stats.mtime.getTime() > expireTime) {
                        fs.unlinkSync(filePath);
                        console.log(`Removed expired room file: ${file}`);
                    }
                }
            });
        } catch (err) {
            console.error('Error cleaning up expired rooms:', err);
        }
    }
};

module.exports= dataStore;