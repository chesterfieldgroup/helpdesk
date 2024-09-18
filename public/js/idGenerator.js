const fs = require('fs');
const path = require('path');

const idFilePath = path.join(__dirname, 'lastId.txt');

// Initialise the counter
let counter = 0;

// Read the last ID from the file if it exists
if (fs.existsSync(idFilePath)) {
    const lastId = fs.readFileSync(idFilePath, 'utf8');
    counter = parseInt(lastId, 10);
}

function generateUniqueId() {
    counter += 1;
    fs.writeFileSync(idFilePath, counter.toString().padStart(6, '0'));
    return `${String(counter).padStart(6, '0')}`;
}

module.exports = generateUniqueId;
