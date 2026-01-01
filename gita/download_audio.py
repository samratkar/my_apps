import os
import json
import requests
from urllib.parse import quote
import time

# Change to script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
print(f"Working directory: {os.getcwd()}\n")

# Create audio directory
audio_dir = 'audio'
if not os.path.exists(audio_dir):
    os.makedirs(audio_dir)
    print(f"Created '{audio_dir}' directory")

# Read the JSON file
with open('gita.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Found {len(data['shlokas'])} shlokas to process\n")

# List of potential audio sources to try
def get_audio_urls(chapter, verse):
    """Generate potential audio URLs from various sources"""
    ch = int(chapter)
    vr = int(verse)
    
    sources = [
        # BhagavadGita.io API
        f"https://bhagavadgita.io/static/audio/{ch:02d}_{vr:03d}.mp3",
        # Gita Supersite
        f"https://www.gitasupersite.iitk.ac.in/srimad/sloka/audio/{ch}/{vr}.mp3",
        # Vedabase audio
        f"https://media.blubrry.com/bhagavad_gita/audio.iskcondesiretree.com/01_-_Srila_Prabhupada_Class/01_-_Bhagavad-Gita/Bhagavad-Gita_{ch:02d}.{vr:02d}.mp3",
        # Another pattern
        f"https://www.holy-bhagavad-gita.org/public/audio/0{ch}/0{ch}{vr:02d}.mp3",
    ]
    return sources

def download_audio(url, filename):
    """Download audio file from URL"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30, stream=True)
        
        if response.status_code == 200:
            # Check if it's actually audio content
            content_type = response.headers.get('content-type', '')
            if 'audio' in content_type or 'mpeg' in content_type or response.content[:3] == b'ID3':
                with open(filename, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                return True
        return False
    except Exception as e:
        return False

# Process each shloka
successful_downloads = 0
failed_downloads = []

for i, shloka in enumerate(data['shlokas']):
    sr_parts = shloka['sr#'].split('-')
    chapter = int(sr_parts[0])
    verse = int(sr_parts[1])
    
    filename = f"audio/{chapter:02d}_{verse:03d}.mp3"
    
    # Check if file already exists
    if os.path.exists(filename):
        print(f"✓ {shloka['sr#']}: Already exists")
        shloka['audio'] = filename
        successful_downloads += 1
        continue
    
    print(f"Downloading {shloka['sr#']}...", end=' ')
    
    # Try each source
    downloaded = False
    sources = get_audio_urls(chapter, verse)
    
    for url in sources:
        if download_audio(url, filename):
            print(f"✓ Success from {url.split('/')[2]}")
            shloka['audio'] = filename
            successful_downloads += 1
            downloaded = True
            break
    
    if not downloaded:
        print(f"✗ Failed")
        failed_downloads.append(shloka['sr#'])
        shloka['audio'] = ''
    
    # Be nice to servers - small delay
    time.sleep(0.5)

# Save updated JSON
with open('gita.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Print summary
print("\n" + "="*60)
print(f"SUMMARY:")
print(f"Total shlokas: {len(data['shlokas'])}")
print(f"Successfully downloaded: {successful_downloads}")
print(f"Failed: {len(failed_downloads)}")

if failed_downloads:
    print(f"\nFailed downloads: {', '.join(failed_downloads)}")
    print("\nYou can manually add audio URLs for these shlokas through the UI.")

print("\n" + "="*60)
print("Audio files saved in 'audio/' directory")
print("JSON file updated with local audio paths")
print("Restart your web server to use the local audio files!")
