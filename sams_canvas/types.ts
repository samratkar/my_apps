export interface GradientTheme {
  id: string;
  name: string;
  classes: string;
  textColor: string;
}

export interface UploadedImage {
  id: string;
  url: string;
}

export type FontFamily = 'Segoe UI' | 'Inter' | 'Playfair Display' | 'Merriweather' | 'Dancing Script' | 'Space Mono' | 'Cinzel' | 'Crimson Text' | 'Libre Baskerville' | 'EB Garamond';

export interface EditorState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  fontFamily: FontFamily;
  fontSize: string;
  color: string;
}