const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('gita.json', 'utf8'));

// Add audio field to each shloka
data.shlokas.forEach(shloka => {
    if (!shloka.audio) {
        shloka.audio = '';
    }
});

// Write back to file
fs.writeFileSync('gita.json', JSON.stringify(data, null, 2), 'utf8');

console.log(`Added audio field to ${data.shlokas.length} shlokas`);
