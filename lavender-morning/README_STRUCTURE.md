# Lavender Morning - Application Structure

## Entry Points

### Default Landing Page: `offline.html`
The offline quote library is now the default landing page. Users can:
- Browse all quotes from the library
- Search and filter by author or book
- View statistics
- Click "Generate New Quote" to access the quote generator

### Quote Generator: `index.html` (App.tsx)
Accessed via the "Generate New Quote" button from the library page. Features:
- **Offline Mode** (Default): Generates quotes from local data
- **Online Mode**: Uses Gemini API to create custom quote cards with AI-generated images
- **API Key**: Only required when switching to Online mode

## Navigation Flow

```
Start → offline.html (Quote Library)
           ↓
    Click "Generate New Quote"
           ↓
    index.html (Generator in Offline Mode)
           ↓
    Switch to "Online Mode" (Optional)
           ↓
    API Key Modal appears (only if needed)
```

## Files

- **offline.html** - Quote library browser (default landing page)
- **index.html** - Quote generator app entry point
- **home.html** - Optional redirect page to offline.html
- **App.tsx** - Main React application
- **data/quotes.yaml** - Quote data source

## Usage

1. **Start**: Open `offline.html` in browser (or `home.html` which redirects)
2. **Browse**: Explore quotes using search, filters, and statistics
3. **Generate**: Click "Generate New Quote" button to create custom quote cards
4. **Online Mode**: Toggle to online mode only when you want AI-generated content (requires API key)

## Development

```bash
npm run dev    # Start development server (for React app at index.html)
```

The offline.html page works standalone without build process.
