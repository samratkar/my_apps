const fs = require('fs');

// Devanagari to Arabic numeral conversion
const devToArabic = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

function convertDevToArabic(devStr) {
    return devStr.split('').map(char => devToArabic[char] || char).join('');
}

// Read the JSON file
const data = JSON.parse(fs.readFileSync('gita.json', 'utf8'));

// Update sr# for each shloka
data.shlokas.forEach(shloka => {
    // Extract chapter-verse number from the Sanskrit text
    // Pattern: ॥chapter-verse॥ with Devanagari numerals
    const match = shloka.shloka.match(/॥([०-९]+)-([०-९]+)॥/);
    if (match) {
        const chapter = convertDevToArabic(match[1]);
        const verse = convertDevToArabic(match[2]);
        shloka['sr#'] = `${chapter}-${verse}`;
    } else {
        // Fallback to chapter number
        shloka['sr#'] = `${shloka.chapter}-?`;
    }
});

// Write back to file
fs.writeFileSync('gita.json', JSON.stringify(data, null, 2), 'utf8');

console.log(`Updated ${data.shlokas.length} shlokas with chapter-verse numbers`);

// Show first few examples
console.log('\nFirst 5 shlokas:');
data.shlokas.slice(0, 5).forEach(s => {
    console.log(`  sr#: ${s['sr#']}, Chapter: ${s.chapter}`);
});
