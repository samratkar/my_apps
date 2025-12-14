import { GradientTheme, FontFamily } from './types';

export const FONTS: { name: string; value: FontFamily }[] = [
  { name: 'Default (Segoe UI)', value: 'Segoe UI' },
  { name: 'Book (Garamond)', value: 'EB Garamond' },
  { name: 'Novel (Crimson)', value: 'Crimson Text' },
  { name: 'Elegant (Baskerville)', value: 'Libre Baskerville' },
  { name: 'Serif (Merriweather)', value: 'Merriweather' },
  { name: 'Display (Playfair)', value: 'Playfair Display' },
  { name: 'Sans (Inter)', value: 'Inter' },
  { name: 'Handwriting', value: 'Dancing Script' },
  { name: 'Cinematic', value: 'Cinzel' },
  { name: 'Mono', value: 'Space Mono' },
];

export const GRADIENTS: GradientTheme[] = [
  { 
    id: 'paper', 
    name: 'Classic Paper', 
    classes: 'bg-[#fdfbf7]', 
    textColor: 'text-slate-900' 
  },
  { 
    id: 'sunset', 
    name: 'Soft Sunset', 
    classes: 'bg-gradient-to-br from-orange-100 via-rose-100 to-amber-100', 
    textColor: 'text-slate-900' 
  },
  { 
    id: 'ocean', 
    name: 'Mist', 
    classes: 'bg-gradient-to-tr from-slate-200 via-gray-100 to-zinc-200', 
    textColor: 'text-slate-800' 
  },
  { 
    id: 'charcoal', 
    name: 'Charcoal', 
    classes: 'bg-gradient-to-br from-gray-800 via-gray-900 to-black', 
    textColor: 'text-gray-100' 
  },
  { 
    id: 'midnight', 
    name: 'Midnight', 
    classes: 'bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900', 
    textColor: 'text-slate-100' 
  },
  { 
    id: 'forest', 
    name: 'Deep Forest', 
    classes: 'bg-gradient-to-br from-emerald-900 via-green-950 to-teal-950', 
    textColor: 'text-emerald-50' 
  },
  { 
    id: 'love', 
    name: 'Romance', 
    classes: 'bg-gradient-to-r from-pink-200 via-rose-100 to-pink-200', 
    textColor: 'text-rose-950' 
  },
  { 
    id: 'aurora', 
    name: 'Aurora', 
    classes: 'bg-gradient-to-bl from-indigo-100 via-purple-100 to-pink-100', 
    textColor: 'text-slate-900' 
  },
  { 
    id: 'gold', 
    name: 'Gilded', 
    classes: 'bg-gradient-to-br from-yellow-100 via-amber-100 to-yellow-50', 
    textColor: 'text-amber-950' 
  },
];