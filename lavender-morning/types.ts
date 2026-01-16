export interface GeneratedContent {
  quote: string;
  author: string;
  book: string;
  hinduDate: string;
  englishDate: string;
  imageSource: string; // Base64 or URL
  isOffline: boolean;
  imageMimeType?: string;
}

export interface TextResponse {
  quote: string;
  authorName: string;
  bookName: string;
  hinduDateDetails: string; // e.g., "Vikram Samvat 2081, Chaitra Shukla Pratipada"
  visualDescription: string;
}

export interface AppState {
  apiKey: string;
  isLoading: boolean;
  isOffline: boolean;
  error: string | null;
  generatedContent: GeneratedContent | null;
}

export interface YamlQuote {
  text: string;
  tags?: string[];
}

export interface YamlAuthor {
  name: string;
  book: string;
  image: string;
  quotes: (string | YamlQuote)[];
}

export interface YamlData {
  authors: YamlAuthor[];
}

export interface SavedSession {
  id: string;
  timestamp: number;
  content: GeneratedContent;
  thumbnailUrl?: string;
}