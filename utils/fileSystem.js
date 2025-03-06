const fs = require('fs');
const path = require('path');



/**
 * Ensures that required directories exist, creates if they don't.
 * */
const ensureDirectoryExists = () => {
    const uploadsDir = path.join(__dirname, 'uploads');
    const dataDir = path.join(__dirname, 'data');

    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, {recursive: true});
    }
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, {recursive: true});
    }
}

/**
* Creates an initial JSON file if it doesn't exist
* @param {string} filePath - Path to the JSON file
* @param {object} initialData - Initial data to write
*/
const ensureJsonFileExists = (filePath, initialData = []) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), 'utf8');
        console.log(`Created file: ${filePath}`);
    }
};

module.exports = {
    ensureDirectoryExists,
    ensureJsonFileExists
};