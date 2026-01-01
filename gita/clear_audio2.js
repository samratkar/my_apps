const fs = require('fs');
const data = JSON.parse(fs.readFileSync('gita.json', 'utf8'));
data.shlokas.forEach(s => s.audio = '');
fs.writeFileSync('gita.json', JSON.stringify(data, null, 2), 'utf8');
console.log(`Cleared audio URLs for ${data.shlokas.length} shlokas`);
