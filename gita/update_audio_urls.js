const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('gita.json', 'utf8'));

// Using YouTube-based audio or other reliable sources
// For now, let's use a pattern that points to Vedabase audio (commonly available)
// Alternative: Use embedded YouTube links or other verified sources

data.shlokas.forEach(shloka => {
    const srParts = shloka['sr#'].split('-');
    const chapter = parseInt(srParts[0]);
    const verse = parseInt(srParts[1]);
    
    // Using Vedabase audio pattern (commonly available and reliable)
    // Format: https://vedabase.io/en/library/bg/[chapter]/[verse]/
    shloka.audio = `https://www.vedabase.com/en/bg/${chapter}/${verse}/`;
    
    // Alternative option: Keep empty for user to add their own
    // shloka.audio = '';
});

// Write back to file
fs.writeFileSync('gita.json', JSON.stringify(data, null, 2), 'utf8');

console.log(`Updated audio URLs to ${data.shlokas.length} shlokas`);
console.log('\nSample URLs:');
data.shlokas.slice(0, 3).forEach(s => {
    console.log(`  ${s['sr#']}: ${s.audio}`);
});
console.log('\nNote: These are links to pages with audio. For direct MP3, users can add their own URLs.');
