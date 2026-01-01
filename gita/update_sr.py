import json
import re

# Read the JSON file
with open('gita.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Update sr# for each shloka
for shloka in data['shlokas']:
    # Extract chapter-verse number from the Sanskrit text
    # Pattern: ॥chapter-verse॥
    match = re.search(r'॥(\d+)-(\d+)॥', shloka['shloka'])
    if match:
        chapter = match.group(1)
        verse = match.group(2)
        shloka['sr#'] = f"{chapter}-{verse}"
    else:
        # Fallback to chapter number
        shloka['sr#'] = f"{shloka['chapter']}-?"

# Write back to file
with open('gita.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Updated {len(data['shlokas'])} shlokas with chapter-verse numbers")
