# Lavender Morning - Offline Quote Library

A beautiful offline quote library viewer with a modern UI based on the Enamor Manager theme.

## Features

### 📚 Data Management
- **YAML Data Loading**: Automatically loads quotes from `data/quotes.yaml`
- **Structured Data**: Organizes quotes by author and book
- **Image Support**: Displays author images with each quote

### 🔍 Search & Filter
- **Full-Text Search**: Search across quotes, authors, and books
- **Author Filter**: Filter quotes by specific author
- **Book Filter**: Filter quotes by specific book
- **Show All**: Quick reset to view all quotes

### 📊 Statistics Dashboard
- **Total Quotes**: Count of all quotes in the library
- **Total Authors**: Number of unique authors
- **Total Books**: Number of unique books
- **Filtered Count**: Real-time count of filtered results
- **Average Quotes/Author**: Statistical average
- **Most Quoted**: Shows the author with the most quotes

### 🎨 User Interface
- **Modern Design**: Based on Enamor Manager's clean, professional theme
- **Gradient Header**: Purple gradient matching Lavender Morning branding
- **Responsive Layout**: Works on desktop and mobile devices
- **Card Grid**: Beautiful card-based quote display
- **Side Panels**: 
  - Left: Authors panel with quote counts
  - Right: Books panel with quote counts

### 🎯 Interactive Features
- **Quote Cards**: Click any quote card to view full details
- **Modal View**: Detailed modal with author image and full quote
- **Random Quote**: Generate a random quote card
- **Color Coding**: Each author/book has a unique color scheme
- **Hover Effects**: Smooth transitions and hover animations

### 📖 Quote Details Modal
- Author name and image
- Book title
- Full quote text with stylized quote marks
- Beautiful formatting with purple accent colors

## File Structure

```
lavender-morning/
├── offline.html          # Main offline quote library page
├── data/
│   ├── quotes.yaml      # Quote data (YAML format)
│   ├── jane.webp        # Author images
│   ├── rumi.webp
│   ├── tagore.webp
│   ├── tolstoy.jpeg
│   ├── fromm.jpeg
│   ├── krishna.jpg
│   └── brene.jpg
└── README_OFFLINE.md    # This file
```

## YAML Data Format

```yaml
authors:
  - name: "Author Name"
    book: "Book Title"
    image: "image-filename.jpg"
    quotes:
      - "Quote text here"
      - "Another quote text"
```

## Usage

1. Open `offline.html` in any modern web browser
2. Browse all quotes in the grid view
3. Use search bar to find specific quotes, authors, or books
4. Filter by author or book using dropdown menus
5. Click on side panel authors/books for quick filtering
6. Click any quote card to view full details
7. Use "Random Quote" button for inspiration

## Technology Stack

- **HTML5**: Semantic markup
- **Tailwind CSS**: Modern utility-first CSS framework (CDN)
- **JavaScript**: Vanilla JS for interactivity
- **js-yaml**: YAML parsing library (CDN)
- **Inter Font**: Clean, professional typography

## Color Scheme

- Primary: Purple (#a855f7, #c084fc)
- Accents: Blue, Pink, Indigo, Violet
- Background: Light gray (#f9fafb)
- Text: Dark gray (#1f2937)

## Browser Compatibility

Works on all modern browsers that support:
- ES6+ JavaScript
- CSS Grid & Flexbox
- Fetch API
- Async/Await

## Future Enhancements

- Export quotes as images
- Favorite quotes feature
- Share quotes on social media
- Dark mode toggle
- Print-friendly layout
- Add more statistical visualizations
