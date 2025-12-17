import React, { useState, useEffect } from 'react';
import { Search, FolderInput, AlertCircle, Sparkles, FileText, CheckCircle2, Download, Key, Eye, EyeOff, Trash2, Database, ExternalLink, Globe, Cpu } from 'lucide-react';
import { Button } from './components/Button';
import { PaperCard } from './components/PaperCard';
import { EmptyState } from './components/EmptyState';
import { VectorDBView } from './components/VectorDBView';
import { ResearchResponse } from './types';
import { fetchPapersByArea } from './services/geminiService';
import { searchPapersFromArxiv } from './services/arxivService';
import JSZip from 'jszip';

const API_KEY_STORAGE_KEY = 'journal-scout-api-key';
const PAPER_COUNT_STORAGE_KEY = 'journal-scout-paper-count';
const DATA_SOURCE_STORAGE_KEY = 'journal-scout-data-source';

type TabType = 'search' | 'vectordb';
type DataSource = 'arxiv' | 'gemini';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [query, setQuery] = useState('');
  const [paperCount, setPaperCount] = useState<number>(20);
  const [dataSource, setDataSource] = useState<DataSource>('arxiv');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Load API key, paper count, and data source from localStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
    }
    const storedCount = localStorage.getItem(PAPER_COUNT_STORAGE_KEY);
    if (storedCount) {
      setPaperCount(parseInt(storedCount, 10));
    }
    const storedSource = localStorage.getItem(DATA_SOURCE_STORAGE_KEY) as DataSource;
    if (storedSource) {
      setDataSource(storedSource);
    }
  }, []);

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    localStorage.setItem(DATA_SOURCE_STORAGE_KEY, source);
  };

  const handlePaperCountChange = (value: number) => {
    const count = Math.min(Math.max(value, 5), 50); // Clamp between 5 and 50
    setPaperCount(count);
    localStorage.setItem(PAPER_COUNT_STORAGE_KEY, count.toString());
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyInput.trim());
      setApiKey(apiKeyInput.trim());
      setApiKeyInput('');
    }
  };

  const handleClearApiKey = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setData(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Gemini requires API key, arXiv doesn't
    if (dataSource === 'gemini' && !apiKey) {
      setError('Please set up your Gemini API key first, or switch to arXiv (no API key required).');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setSaveStatus('idle');

    try {
      let result: ResearchResponse;
      
      if (dataSource === 'arxiv') {
        // Use arXiv - real papers with PDFs, no API key needed
        result = await searchPapersFromArxiv(query, paperCount);
      } else {
        // Use Gemini - AI-generated paper suggestions
        result = await fetchPapersByArea(query, apiKey, paperCount);
      }
      
      setData(result);
    } catch (err: any) {
      console.error("Search error:", err);
      if (dataSource === 'gemini') {
        if (err.message?.includes('API key') || err.message?.includes('invalid') || err.message?.includes('API_KEY')) {
          setError("Invalid API key. Please check your Gemini API key and try again.");
        } else if (err.message?.includes('quota') || err.message?.includes('rate')) {
          setError("API quota exceeded. Please wait a moment and try again.");
        } else {
          setError(`Failed to fetch papers: ${err.message || 'Unknown error'}. Please try again.`);
        }
      } else {
        setError(`arXiv search failed: ${err.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateContent = (data: ResearchResponse) => {
    // Generate Catalogue CSV content
    const csvContent = [
      'ID,Title,Authors,Journal,Year,Citations,Key Findings,Abstract,PDF URL,arXiv URL',
      ...data.papers.map((p, i) => {
        return [
          i + 1,
          `"${p.title.replace(/"/g, '""')}"`,
          `"${p.authors.replace(/"/g, '""')}"`,
          `"${p.journal.replace(/"/g, '""')}"`,
          p.year,
          `"${p.citations}"`,
          `"${p.keyFindings.replace(/"/g, '""')}"`,
          `"${p.abstract.replace(/"/g, '""')}"`,
          `"${p.pdfUrl || ''}"`,
          `"${p.arxivUrl || ''}"`
        ].join(',');
      })
    ].join('\n');

    // Generate individual paper contents
    const papers = data.papers.map((paper, i) => {
      const safeTitle = paper.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const fileName = `Paper_${i + 1}_${safeTitle}.txt`;
      const content = `TITLE: ${paper.title}
AUTHORS: ${paper.authors}
JOURNAL: ${paper.journal} (${paper.year})
CITATIONS: ${paper.citations}
${paper.pdfUrl ? `PDF: ${paper.pdfUrl}` : ''}
${paper.arxivUrl ? `arXiv: ${paper.arxivUrl}` : ''}

KEY FINDINGS:
${paper.keyFindings}

ABSTRACT:
${paper.abstract}

----------------------------------------
Generated by Journal Scout
`;
      return { fileName, content };
    });

    return { csvContent, papers };
  };

  const handleDownloadToDisk = async () => {
    if (!data) return;
    setSaveStatus('saving');

    const { csvContent, papers } = generateContent(data);
    const safeAreaName = data.area.replace(/[^a-z0-9]/gi, '_');

    try {
      let useZipFallback = false;

      // 1. Try Native File System Access API (Chrome/Edge/Opera)
      if ('showDirectoryPicker' in window) {
        try {
          // @ts-ignore
          const dirHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
          });

          // Write Catalogue
          const catalogueName = `CATALOGUE_${safeAreaName}.csv`;
          const catalogueFile = await dirHandle.getFileHandle(catalogueName, { create: true });
          const catWritable = await catalogueFile.createWritable();
          await catWritable.write(csvContent);
          await catWritable.close();

          // Write Papers
          for (const paper of papers) {
            const fileHandle = await dirHandle.getFileHandle(paper.fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(paper.content);
            await writable.close();
          }
        } catch (err: any) {
          // If user clicked 'cancel', stop everything
          if (err.name === 'AbortError') {
            setSaveStatus('idle');
            return;
          }
          // If other error (permission denied, not supported context), trigger fallback
          console.warn("Native file system failed, falling back to ZIP:", err);
          useZipFallback = true;
        }
      } else {
        useZipFallback = true;
      }

      // 2. Fallback: Generate and Download ZIP (Firefox/Safari/Mobile)
      if (useZipFallback) {
        const zip = new JSZip();
        
        // Add Catalogue
        zip.file(`CATALOGUE_${safeAreaName}.csv`, csvContent);
        
        // Add Papers Folder
        const papersFolder = zip.folder("Papers");
        if (papersFolder) {
          papers.forEach(p => {
            papersFolder.file(p.fileName, p.content);
          });
        }

        // Generate Blob
        const blob = await zip.generateAsync({ type: "blob" });
        
        // Trigger Download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `JournalScout_${safeAreaName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 5000);

    } catch (err: any) {
      console.error("Save error:", err);
      setSaveStatus('error');
      alert("An unexpected error occurred while saving. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-academic-600 text-white p-1.5 rounded-lg">
              <Sparkles size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Journal Scout</h1>
          </div>
          <div className="flex items-center gap-4">
            {apiKey && (
              <>
                {/* Tab Navigation */}
                <div className="hidden sm:flex items-center bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'search'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Search size={14} />
                      Search
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('vectordb')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      activeTab === 'vectordb'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Database size={14} />
                      Vector DB
                    </span>
                  </button>
                </div>
                <button
                  onClick={handleClearApiKey}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition-colors"
                  title="Clear API Key"
                >
                  <Key size={16} />
                  <span className="hidden sm:inline">Change API Key</span>
                </button>
              </>
            )}
            <div className="hidden sm:block text-sm text-slate-500">
              Research Assistant v2.0
            </div>
          </div>
        </div>
        {/* Mobile Tab Navigation */}
        {apiKey && (
          <div className="sm:hidden border-t border-slate-100 px-4 py-2 flex gap-2">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'search'
                  ? 'bg-academic-100 text-academic-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Search size={14} />
                Search
              </span>
            </button>
            <button
              onClick={() => setActiveTab('vectordb')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'vectordb'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Database size={14} />
                Vector DB
              </span>
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* API Key Setup */}
        {!apiKey ? (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-academic-100 rounded-full mb-4">
                <Key className="w-8 h-8 text-academic-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Welcome to Journal Scout
              </h2>
              <p className="text-slate-600">
                Search real research papers from arXiv (no API key needed), or set up a Gemini API key for AI-powered suggestions.
              </p>
            </div>

            {/* Quick Start with arXiv */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Globe className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">Quick Start with arXiv</h3>
              </div>
              <p className="text-green-700 text-sm mb-4">
                Search real academic papers from arXiv with direct PDF downloads. No API key required!
              </p>
              <Button 
                onClick={() => {
                  setDataSource('arxiv');
                  setApiKey('arxiv-mode');
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Globe size={18} className="mr-2" />
                Start with arXiv (Free)
              </Button>
            </div>

            <div className="relative flex items-center justify-center my-6">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-slate-50 px-4 text-sm text-slate-400 absolute">or</span>
            </div>

            <form onSubmit={handleSaveApiKey} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-5 h-5 text-academic-600" />
                <label className="text-sm font-medium text-slate-700">
                  Gemini API Key (for AI suggestions)
                </label>
              </div>
              <div className="relative mb-4">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="block w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-base placeholder-slate-400 focus:outline-none focus:border-academic-500 focus:ring-2 focus:ring-academic-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <Button type="submit" className="w-full" disabled={!apiKeyInput.trim()}>
                Save API Key
              </Button>
              <p className="mt-4 text-xs text-slate-500 text-center">
                Don't have an API key?{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-academic-600 hover:underline"
                >
                  Get one free from Google AI Studio
                </a>
              </p>
            </form>
          </div>
        ) : (
          <>
            {/* Tab Content */}
            {activeTab === 'search' ? (
              <>
                {/* Search Section */}
                <div className="max-w-3xl mx-auto mb-12">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                      Curate Your Research Library
                </h2>
                <p className="text-lg text-slate-600">
                  Find 50 influential papers in your field and automatically save a catalogue to your computer.
                </p>
              </div>

              <form onSubmit={handleSearch} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-academic-500 transition-colors">
                  <Search className="h-6 w-6" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Quantum Computing, CRISPR, Behavioral Economics..."
                  className="block w-full pl-12 pr-32 py-4 bg-white border-2 border-slate-200 rounded-2xl text-lg placeholder-slate-400 focus:outline-none focus:border-academic-500 focus:ring-4 focus:ring-academic-500/10 transition-all shadow-sm hover:shadow-md"
                  autoFocus
                />
                <div className="absolute inset-y-2 right-2">
                  <Button 
                    type="submit" 
                    isLoading={loading}
                    className="h-full rounded-xl text-base px-6"
                  >
                    Search Papers
                  </Button>
                </div>
              </form>
              
              {/* Paper Count Selector */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <label className="text-sm text-slate-600">Number of papers:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaperCountChange(paperCount - 5)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                    disabled={paperCount <= 5}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={paperCount}
                    onChange={(e) => handlePaperCountChange(parseInt(e.target.value, 10) || 20)}
                    min={5}
                    max={50}
                    className="w-16 text-center py-1 px-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-academic-500"
                  />
                  <button
                    type="button"
                    onClick={() => handlePaperCountChange(paperCount + 5)}
                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium transition-colors"
                    disabled={paperCount >= 50}
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-400">(5-50)</span>
              </div>
              
              {/* Data Source Toggle */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <label className="text-sm text-slate-600">Data Source:</label>
                <div className="flex items-center bg-slate-100 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => handleDataSourceChange('arxiv')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      dataSource === 'arxiv'
                        ? 'bg-white text-green-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <Globe size={16} />
                    arXiv
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDataSourceChange('gemini')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      dataSource === 'gemini'
                        ? 'bg-white text-academic-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <Cpu size={16} />
                    Gemini AI
                  </button>
                </div>
                <p className="text-xs text-slate-500 max-w-md text-center">
                  {dataSource === 'arxiv' 
                    ? '✓ Real papers from arXiv with full PDFs - No API key required!'
                    : 'AI-generated paper suggestions - Requires Gemini API key'}
                </p>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Results Section */}
            {data ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-academic-50 border border-academic-100 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {data.papers.length} Papers Found
                    </h3>
                    <p className="text-slate-600 mt-1">
                      Ready to download catalogue and paper summaries for <span className="font-semibold text-academic-700">{data.area}</span>.
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Button 
                      onClick={handleDownloadToDisk}
                      isLoading={saveStatus === 'saving'}
                      variant={saveStatus === 'success' ? 'outline' : 'primary'}
                      className={`w-full md:w-auto text-lg py-6 px-8 ${saveStatus === 'success' ? 'border-green-500 text-green-600 bg-green-50' : ''}`}
                      icon={saveStatus === 'success' ? <CheckCircle2 /> : <Download />}
                    >
                      {saveStatus === 'idle' && "Download All"}
                      {saveStatus === 'saving' && "Saving..."}
                      {saveStatus === 'success' && "Saved Successfully!"}
                      {saveStatus === 'error' && "Try Again"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.papers.map((paper, index) => (
                    <PaperCard key={index} paper={paper} index={index} />
                  ))}
                </div>
              </div>
            ) : (
              !loading && <EmptyState />
            )}
            
            {/* Loading Skeleton */}
            {loading && !data && (
              <div className="space-y-6">
                <div className="h-24 bg-slate-100 rounded-2xl animate-pulse w-full"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="bg-slate-100 rounded-xl h-64 w-full"></div>
                  ))}
                </div>
              </div>
            )}
              </>
            ) : (
              /* Vector DB Tab */
              <VectorDBView apiKey={apiKey} />
            )}
          </>
        )}

      </main>
    </div>
  );
};

export default App;