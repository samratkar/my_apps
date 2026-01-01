import os
import json

# Change to script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Read the JSON file
with open('gita.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Updating {len(data['shlokas'])} shlokas with YouTube embed links\n")

# Update each shloka with YouTube-based audio link
# Using a popular Gita recitation channel
for shloka in data['shlokas']:
    sr_parts = shloka['sr#'].split('-')
    chapter = int(sr_parts[0])
    verse = int(sr_parts[1])
    
    # For now, set empty - users can add via UI
    # Or we can add links to external audio pages
    shloka['audio'] = ''

# Save updated JSON
with open('gita.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("JSON updated. Audio URLs cleared for users to add their own.")
print("\nTo add audio:")
print("1. Find audio on YouTube/websites")
print("2. Download as MP3 and place in 'audio/' folder")
print("3. Use format: audio/01_001.mp3 for Chapter 1, Verse 1")
print("4. Add the path through the UI")
