# Bhagavad Gita Audio Setup

## How to Add Audio to Shlokas

Since direct MP3 downloads from public sources often fail due to CORS or availability issues, here are the recommended approaches:

### Option 1: Download Audio Files Manually

1. **Find Audio Sources:**
   - Search YouTube for "Bhagavad Gita Chapter X Verse Y Sanskrit"
   - Use online tools like `youtube-dl` or `yt-dlp` to download as MP3
   - Or visit websites like: bhagavad-gita.org, holy-bhagavad-gita.org

2. **Name Files Correctly:**
   - Format: `CC_VVV.mp3` (e.g., `01_001.mp3` for Chapter 1, Verse 1)
   - Chapter padded to 2 digits, Verse padded to 3 digits

3. **Place in Audio Folder:**
   - Put all MP3 files in the `audio/` directory
   - Example: `audio/02_047.mp3` for the famous verse 2-47

4. **Update JSON:**
   - Run: `python setup_audio_local.py`
   - Or manually edit `gita.json` to set `"audio": "audio/01_001.mp3"`

### Option 2: Use YouTube Embeds

For shlokas where you find good YouTube videos:
1. Get the YouTube video ID
2. Add through UI: `https://www.youtube.com/watch?v=VIDEO_ID`
3. The UI will handle it appropriately

### Option 3: Use the UI

1. Open the application
2. Click on any shloka card
3. In the audio section, paste a direct MP3 URL or YouTube link
4. Click "Save"

## Using yt-dlp to Download Audio

Install yt-dlp:
```bash
pip install yt-dlp
```

Download a specific video as MP3:
```bash
yt-dlp -x --audio-format mp3 -o "audio/01_001.mp3" "https://www.youtube.com/watch?v=VIDEO_ID"
```

## Recommended YouTube Channels

- Hare Krsna TV
- ISKCON Silicon Valley
- Bhaktivedanta Library
- Gita Global

## File Structure

```
gita/
├── audio/
│   ├── 01_001.mp3
│   ├── 01_028.mp3
│   ├── 02_007.mp3
│   └── ...
├── gita.json
├── index.html
└── download_audio.py
```

## Testing Audio Files

After adding files, restart your web server:
```bash
python -m http.server 8088
```

Then open http://localhost:8088 and test the audio players.
