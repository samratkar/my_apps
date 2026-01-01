import os
import json

# Change to script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

print("Scanning for audio files in 'audio/' directory...\n")

# Check if audio directory exists
if not os.path.exists('audio'):
    print("Error: 'audio/' directory not found!")
    print("Please create it and add your MP3 files.")
    exit(1)

# Read the JSON file
with open('gita.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Scan for available audio files
audio_files = {}
for filename in os.listdir('audio'):
    if filename.endswith('.mp3'):
        # Extract chapter and verse from filename (format: CC_VVV.mp3)
        try:
            parts = filename.replace('.mp3', '').split('_')
            chapter = int(parts[0])
            verse = int(parts[1])
            sr = f"{chapter}-{verse}"
            audio_files[sr] = f"audio/{filename}"
            print(f"Found: {filename} -> {sr}")
        except:
            print(f"Skipping: {filename} (invalid format)")

print(f"\nFound {len(audio_files)} audio files")

# Update shlokas with available audio
updated_count = 0
for shloka in data['shlokas']:
    sr = shloka['sr#']
    if sr in audio_files:
        shloka['audio'] = audio_files[sr]
        updated_count += 1

# Save updated JSON
with open('gita.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"\n{'='*60}")
print(f"Updated {updated_count} shlokas with local audio paths")
print(f"Missing audio for {len(data['shlokas']) - updated_count} shlokas")
print(f"{'='*60}")
print("\nRestart your web server to see the changes!")
print("Any shlokas without audio will show an input field to add URLs manually.")
