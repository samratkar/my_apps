// Semantic Scholar API Service
// Fetches real research papers with abstracts and links (browser-friendly)

export interface SemanticScholarPaper {
  paperId: string;
  title: string;
  authors: { name: string }[];
  year: number;
  abstract: string;
  url: string;
  venue: string;
  isOpenAccess: boolean;
  openAccessPdf?: { url: string };
  citationCount: number;
}

export interface SemanticScholarSearchResult {
  papers: SemanticScholarPaper[];
  total: number;
  query: string;
}

export const searchSemanticScholar = async (
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<SemanticScholarSearchResult> => {
  const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&fields=title,authors,year,abstract,url,venue,isOpenAccess,openAccessPdf,citationCount`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Semantic Scholar API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return {
    papers: data.data,
    total: data.total,
    query,
  };
};

export const semanticScholarToAppPaper = (paper: SemanticScholarPaper) => ({
  title: paper.title,
  authors: paper.authors.map(a => a.name).join(', '),
  journal: paper.venue || 'Semantic Scholar',
  year: paper.year ? paper.year.toString() : 'N/A',
  citations: paper.citationCount?.toString() || 'N/A',
  abstract: paper.abstract || '',
  keyFindings: '',
  pdfUrl: paper.openAccessPdf?.url || '',
  arxivUrl: paper.url,
  arxivId: paper.paperId,
});

export const searchPapersFromSemanticScholar = async (
  query: string,
  maxResults: number = 20
) => {
  const result = await searchSemanticScholar(query, maxResults);
  return {
    area: query,
    papers: result.papers.map(semanticScholarToAppPaper),
  };
};
