import yaml from 'js-yaml';
import { YamlData, YamlAuthor } from '../types';

const YAML_PATH = './quotes.yaml';

// Fallback data if file fetch fails
const FALLBACK_YAML = `
authors:
  - name: "Jane Austen"
    book: "Pride and Prejudice"
    image: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Jane_Austen_coloured_version.jpg"
    quotes:
      - "I declare after all there is no enjoyment like reading!"
  - name: "Erich Fromm"
    book: "The Art of Loving"
    image: "https://upload.wikimedia.org/wikipedia/commons/0/03/Erich_Fromm_1974.jpg"
    quotes:
      - "Love isn't something natural."
`;

async function loadData(): Promise<YamlData> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1500); // 1.5s timeout
    
    const response = await fetch(YAML_PATH, { signal: controller.signal });
    clearTimeout(id);
    
    if (response.ok) {
      const text = await response.text();
      return yaml.load(text) as YamlData;
    }
  } catch (e) {
    console.warn("Could not fetch YAML file, using fallback.", e);
  }
  return yaml.load(FALLBACK_YAML) as YamlData;
}

export const getLibraryCatalog = async (): Promise<{name: string, book: string}[]> => {
  const data = await loadData();
  return data.authors.map(a => ({ name: a.name, book: a.book }));
};

export const getOfflineContent = async (bookFilter?: string, authorFilter?: string): Promise<{ quote: string; author: string; book: string; image: string }> => {
  const data = await loadData();
  let candidateAuthors = data.authors;

  // Filter if user specified a book or author
  if (bookFilter || authorFilter) {
    const filtered = data.authors.filter(a => {
      const matchesBook = bookFilter ? a.book.toLowerCase().includes(bookFilter.toLowerCase()) : true;
      const matchesAuthor = authorFilter ? a.name.toLowerCase().includes(authorFilter.toLowerCase()) : true;
      return matchesBook && matchesAuthor;
    });
    
    if (filtered.length > 0) {
      candidateAuthors = filtered;
    }
    // If no match found, we fall back to all authors (or could return an error, but fallback is safer for UI)
  }

  // Pick random author from candidates
  const randomAuthor = candidateAuthors[Math.floor(Math.random() * candidateAuthors.length)];
  
  // Pick random quote
  const randomQuote = randomAuthor.quotes[Math.floor(Math.random() * randomAuthor.quotes.length)];

  return {
    quote: randomQuote,
    author: randomAuthor.name,
    book: randomAuthor.book,
    image: randomAuthor.image
  };
};

export const getHinduDateOffline = (): string => {
  // Static placeholder as requested previously
  return `Vikram Samvat 2081 (Approx)`; 
};