# Quick Start: Adding Audio to Bhagavad Gita

## The Problem
Direct downloads from public MP3 sources fail due to CORS, authentication, or availability issues.

## The Solution
Download audio files locally and serve them from your own server (no CORS issues!)

## Quick Setup (3 Steps)

### Step 1: Get Audio Files

**Option A - Use yt-dlp (Recommended):**
```bash
# Install yt-dlp
pip install yt-dlp

# Download a specific verse
# Replace VIDEO_ID with actual YouTube video ID
yt-dlp -x --audio-format mp3 -o "audio/01_001.mp3" "https://www.youtube.com/watch?v=VIDEO_ID"
```

**Option B - Manual Download:**
1. Find YouTube videos with Gita recitations
2. Use any online YouTube to MP3 converter
3. Download and rename to format: `CC_VVV.mp3`

**Popular YouTube Searches:**
- "Bhagavad Gita Chapter 1 Sanskrit"
- "Bhagavad Gita verses with meaning"
- "Gita shloka recitation"

### Step 2: Place Files in audio/ Folder

Your files should be named like:
- `01_001.mp3` = Chapter 1, Verse 1
- `02_047.mp3` = Chapter 2, Verse 47  
- `18_066.mp3` = Chapter 18, Verse 66

```
gita/
└── audio/
    ├── 01_001.mp3
    ├── 01_028.mp3
    ├── 02_007.mp3
    └── ...
```

### Step 3: Update JSON and Restart

```bash
# Update the JSON with local audio paths
python setup_local_audio.py

# Restart web server
python -m http.server 8088
```

Visit http://localhost:8088 and enjoy!

## Example: Full Workflow

```bash
# 1. Install yt-dlp
pip install yt-dlp

# 2. Download Chapter 2 Verse 47 (example)
yt-dlp -x --audio-format mp3 -o "audio/02_047.mp3" "https://www.youtube.com/watch?v=EXAMPLE_ID"

# 3. Scan and update JSON
python setup_local_audio.py

# 4. Start server
python -m http.server 8088
```

## No Audio Files? No Problem!

The UI allows manual entry of audio URLs:
1. Find any online MP3 or audio page
2. Copy the URL
3. Paste in the audio input field on each card
4. Click "Save"

The audio settings are saved in your browser's localStorage!
