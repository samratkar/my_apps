export interface Paper {
  title: string;
  authors: string;
  journal: string;
  year: string;
  citations: string;
  abstract: string;
  keyFindings: string;
}

export interface Journal {
  title: string;
  publisher: string;
  quartile: string;
  rank: number;
  focusArea: string;
  impactFactor: string;
}

export interface ResearchResponse {
  area: string;
  papers: Paper[];
}

export type ExportFormat = 'json' | 'csv' | 'txt';