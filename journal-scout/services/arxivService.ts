/**
 * ArXiv API Service
 * Fetches real research papers from arXiv with full abstracts and PDF links
 * No API key required - completely free!
 */

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  published: string;
  updated: string;
  categories: string[];
  pdfUrl: string;
  arxivUrl: string;
  doi?: string;
  journal?: string;
  comment?: string;
}

export interface ArxivSearchResult {
  papers: ArxivPaper[];
  totalResults: number;
  query: string;
}

/**
 * Search arXiv for papers matching a query
 */
export const searchArxiv = async (
  query: string,
  maxResults: number = 20,
  start: number = 0
): Promise<ArxivSearchResult> => {
  // Build the arXiv API URL
  const baseUrl = 'https://export.arxiv.org/api/query';
  const params = new URLSearchParams({
    search_query: `all:${encodeURIComponent(query)}`,
    start: start.toString(),
    max_results: maxResults.toString(),
    sortBy: 'relevance',
    sortOrder: 'descending',
  });

  const response = await fetch(`${baseUrl}?${params}`);
  
  if (!response.ok) {
    throw new Error(`arXiv API error: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();
  
  // Parse the XML response
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  
  // Check for parse errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Failed to parse arXiv response');
  }

  // Get total results count
  const totalResultsElem = xmlDoc.querySelector('opensearch\\:totalResults, totalResults');
  const totalResults = totalResultsElem ? parseInt(totalResultsElem.textContent || '0', 10) : 0;

  // Parse each entry
  const entries = xmlDoc.querySelectorAll('entry');
  const papers: ArxivPaper[] = [];

  entries.forEach((entry) => {
    // Get the arXiv ID from the URL
    const idUrl = entry.querySelector('id')?.textContent || '';
    const id = idUrl.split('/abs/').pop()?.split('v')[0] || idUrl;

    // Get title (clean up whitespace)
    const title = (entry.querySelector('title')?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();

    // Get authors
    const authorElems = entry.querySelectorAll('author');
    const authors = Array.from(authorElems)
      .map((a) => a.querySelector('name')?.textContent || '')
      .filter(Boolean);
    const authorsStr = authors.length > 3 
      ? `${authors.slice(0, 3).join(', ')} et al.`
      : authors.join(', ');

    // Get abstract (clean up whitespace)
    const abstract = (entry.querySelector('summary')?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();

    // Get dates
    const published = entry.querySelector('published')?.textContent || '';
    const updated = entry.querySelector('updated')?.textContent || '';

    // Get categories
    const categoryElems = entry.querySelectorAll('category');
    const categories = Array.from(categoryElems)
      .map((c) => c.getAttribute('term') || '')
      .filter(Boolean);

    // Get links
    const linkElems = entry.querySelectorAll('link');
    let pdfUrl = '';
    let arxivUrl = '';
    
    linkElems.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const linkTitle = link.getAttribute('title') || '';
      const type = link.getAttribute('type') || '';
      
      if (linkTitle === 'pdf' || type === 'application/pdf') {
        pdfUrl = href;
      } else if (link.getAttribute('rel') === 'alternate' || href.includes('/abs/')) {
        arxivUrl = href;
      }
    });

    // Fallback PDF URL construction
    if (!pdfUrl && id) {
      pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;
    }
    if (!arxivUrl && id) {
      arxivUrl = `https://arxiv.org/abs/${id}`;
    }

    // Get DOI if available
    const doiElem = entry.querySelector('arxiv\\:doi, doi');
    const doi = doiElem?.textContent || undefined;

    // Get journal reference if available
    const journalElem = entry.querySelector('arxiv\\:journal_ref, journal_ref');
    const journal = journalElem?.textContent || undefined;

    // Get comment if available
    const commentElem = entry.querySelector('arxiv\\:comment, comment');
    const comment = commentElem?.textContent || undefined;

    papers.push({
      id,
      title,
      authors: authorsStr,
      abstract,
      published,
      updated,
      categories,
      pdfUrl,
      arxivUrl,
      doi,
      journal,
      comment,
    });
  });

  return {
    papers,
    totalResults,
    query,
  };
};

/**
 * Fetch the full text content of a paper from its PDF
 * Note: This uses a PDF-to-text service since browsers can't directly parse PDFs
 */
export const fetchPaperFullText = async (pdfUrl: string): Promise<string> => {
  // For browser-based apps, we need to use a CORS proxy or PDF.js
  // This is a simplified version that returns the abstract for now
  // In a real implementation, you'd use PDF.js to extract text
  
  throw new Error('PDF text extraction requires server-side processing or PDF.js integration');
};

/**
 * Convert arXiv paper to the app's Paper format
 */
export const arxivToAppPaper = (arxiv: ArxivPaper): {
  title: string;
  authors: string;
  journal: string;
  year: string;
  citations: string;
  abstract: string;
  keyFindings: string;
  pdfUrl: string;
  arxivUrl: string;
  arxivId: string;
} => {
  const year = arxiv.published ? new Date(arxiv.published).getFullYear().toString() : 'N/A';
  
  return {
    title: arxiv.title,
    authors: arxiv.authors,
    journal: arxiv.journal || `arXiv:${arxiv.id} [${arxiv.categories[0] || 'cs'}]`,
    year,
    citations: 'N/A', // arXiv doesn't provide citation counts
    abstract: arxiv.abstract,
    keyFindings: arxiv.comment || `Published: ${arxiv.published?.split('T')[0] || 'N/A'}`,
    pdfUrl: arxiv.pdfUrl,
    arxivUrl: arxiv.arxivUrl,
    arxivId: arxiv.id,
  };
};

/**
 * Search and convert papers for the app
 */
export const searchPapersFromArxiv = async (
  query: string,
  maxResults: number = 20
): Promise<{
  area: string;
  papers: ReturnType<typeof arxivToAppPaper>[];
}> => {
  const result = await searchArxiv(query, maxResults);
  
  return {
    area: query,
    papers: result.papers.map(arxivToAppPaper),
  };
};
