const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('gita.json', 'utf8'));

// Base URL for Bhagavad Gita audio (using a common pattern)
// Many sites use chapter-verse pattern for audio files
const audioBaseUrl = 'https://www.holy-bhagavad-gita.org/public/audio/';

// Update audio for each shloka
data.shlokas.forEach(shloka => {
    const srParts = shloka['sr#'].split('-');
    const chapter = srParts[0].padStart(2, '0');
    const verse = srParts[1].padStart(3, '0');
    
    // Format: ChapterXX_VerseXXX.mp3
    // Using alternative URL pattern that's commonly available
    shloka.audio = `https://bhagavadgita.io/static/audio/${chapter}_${verse}.mp3`;
});

// Write back to file
fs.writeFileSync('gita.json', JSON.stringify(data, null, 2), 'utf8');

console.log(`Added audio URLs to ${data.shlokas.length} shlokas`);
console.log('\nSample URLs:');
data.shlokas.slice(0, 5).forEach(s => {
    console.log(`  ${s['sr#']}: ${s.audio}`);
});
