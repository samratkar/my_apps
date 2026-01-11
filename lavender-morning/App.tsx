import React, { useState, useEffect } from 'react';
import ApiKeyModal from './components/ApiKeyModal';
import { AppState, GeneratedContent } from './types';
import { generateMorningContent } from './services/genai';
import { getOfflineContent, getHinduDateOffline, getLibraryCatalog } from './services/offline';
import { BookIcon, SparklesIcon, LoadingSpinner, HistoryIcon } from './components/Icons';
import ResultCanvas from './components/ResultCanvas';
import SessionHistory from './components/SessionHistory';

const App = () => {
  // Check URL parameter for mode
  const urlParams = new URLSearchParams(window.location.search);
  const urlMode = urlParams.get('mode');
  const initialOfflineMode = urlMode === 'offline' || urlMode === null;
  
  const [state, setState] = useState<AppState>({
    apiKey: '',
    isLoading: false,
    isOffline: initialOfflineMode,
    error: null,
    generatedContent: null,
  });

  const [bookInput, setBookInput] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [library, setLibrary] = useState<{name: string, book: string}[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load Library Catalog on mount
  useEffect(() => {
    const fetchLibrary = async () => {
      const items = await getLibraryCatalog();
      setLibrary(items);
    };
    fetchLibrary();
  }, []);

  const handleApiKeySubmit = (key: string) => {
    setState(prev => ({ ...prev, apiKey: key }));
  };

  const toggleMode = () => {
    setState(prev => ({ 
      ...prev, 
      isOffline: !prev.isOffline, 
      error: null, 
      generatedContent: null 
    }));
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    
    // Format: "Book Name|Author Name"
    const [b, a] = val.split('|');
    setBookInput(b);
    setAuthorInput(a);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for API key if trying to use online mode
    if (!state.isOffline && !state.apiKey) {
      setState(prev => ({ ...prev, error: "API key required for online mode. Please enter your API key or switch to offline mode." }));
      return;
    }
    
    // Validation only needed for Online mode if strict, but let's allow "empty" for offline random
    if (!state.isOffline && !bookInput && !authorInput) {
      setState(prev => ({ ...prev, error: "Please enter a book name or an author." }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, generatedContent: null }));

    try {
      const today = new Date().toLocaleDateString('en-GB', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      });

      let newContent: GeneratedContent;

      if (state.isOffline) {
        // --- Offline Mode ---
        // Pass the inputs to filter the offline content
        const offlineData = await getOfflineContent(bookInput, authorInput);
        
        newContent = {
          quote: offlineData.quote,
          author: offlineData.author,
          book: offlineData.book,
          hinduDate: getHinduDateOffline(),
          englishDate: today,
          imageSource: offlineData.image, // URL
          isOffline: true
        };
      } else {
        // --- Online Mode (Gemini) ---
        const { textData, imageBase64, imageMimeType } = await generateMorningContent(
          state.apiKey,
          bookInput,
          authorInput
        );

        newContent = {
          quote: textData.quote,
          author: textData.authorName,
          book: textData.bookName || bookInput,
          hinduDate: textData.hinduDateDetails,
          englishDate: today,
          imageSource: imageBase64, // Base64
          imageMimeType: imageMimeType,
          isOffline: false
        };
      }

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        generatedContent: newContent 
      }));

    } catch (err: any) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err.message || "Something went wrong." 
      }));
    }
  };

  const reset = () => {
    setState(prev => ({ ...prev, generatedContent: null, error: null }));
    // We intentionally do NOT reset bookInput/authorInput here 
    // to "remember the book and author names as was entered" per user request.
  };

  const handleLoadSession = (content: GeneratedContent) => {
    setState(prev => ({ 
      ...prev, 
      generatedContent: content,
      error: null 
    }));
    setShowHistory(false);
  };

  // Show API key modal only when trying to use online mode without key
  const needsApiKey = !state.apiKey && !state.isOffline && (state.isLoading || state.error);
  
  if (needsApiKey) {
    return (
       <>
         <ApiKeyModal onSubmit={handleApiKeySubmit} />
          <div className="fixed bottom-4 right-4 z-[60]">
             <button onClick={() => setState(prev => ({...prev, isOffline: true, error: null}))} className="text-white underline text-sm opacity-80">
               Use Offline Mode
             </button>
          </div>
       </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lavender-50 via-white to-lavender-100 text-gray-800">
      
      {/* Header */}
      <header className="p-6 text-center border-b border-lavender-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 md:text-left flex gap-2">
          <a
            href="./index.html"
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all font-bold shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <BookIcon className="w-5 h-5" />
            Back to Library
          </a>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-lavender-600 hover:bg-lavender-700 text-white rounded-full transition-all font-bold shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <HistoryIcon className="w-5 h-5" />
            View Saved Sessions
          </button>
        </div>
        <div className="flex-1 text-center">
          <h1 className="font-serif text-3xl md:text-4xl text-lavender-900 font-bold flex items-center justify-center gap-3">
            <SparklesIcon className="w-8 h-8 text-lavender-500" />
            Lavender Morning
          </h1>
          <p className="text-lavender-700 mt-2 font-light">Literary greetings for a beautiful start</p>
        </div>
        <div className="flex-1 flex justify-center md:justify-end">
          <button 
            onClick={toggleMode}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all border-2 ${
              state.isOffline 
                ? 'bg-gray-200 text-gray-600 border-gray-300' 
                : 'bg-lavender-100 text-lavender-700 border-lavender-200'
            }`}
          >
            {state.isOffline ? 'Offline Mode' : 'Online Mode'}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        
        {/* Input Section - Only show if no result yet */}
        {!state.generatedContent && !state.isLoading && (
          <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-8 border border-lavender-100 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-center mb-6">
              <div className={`p-4 rounded-full ${state.isOffline ? 'bg-gray-100' : 'bg-lavender-50'}`}>
                <BookIcon className={`w-10 h-10 ${state.isOffline ? 'text-gray-500' : 'text-lavender-600'}`} />
              </div>
            </div>
            
            <h2 className="text-2xl font-serif text-center mb-6 text-gray-800">
              {state.isOffline ? "Select from our collection" : "Who inspires you today?"}
            </h2>
            
            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Dropdown for Library Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                  Select from Library
                </label>
                <div className="relative">
                  <select 
                    onChange={handleDropdownChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-lavender-500 focus:ring-2 focus:ring-lavender-200 outline-none transition-all bg-white appearance-none cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Choose a Book --</option>
                    {library.map((item, idx) => (
                      <option key={idx} value={`${item.book}|${item.name}`}>
                        {item.book} ({item.name})
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                  </div>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase tracking-widest">Or Type Manually</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Manual Inputs */}
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Book Title</label>
                <input
                  type="text"
                  value={bookInput}
                  onChange={(e) => setBookInput(e.target.value)}
                  placeholder="e.g. Pride and Prejudice"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-lavender-500 focus:ring-2 focus:ring-lavender-200 outline-none transition-all bg-lavender-50/30"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Author Name</label>
                <input
                  type="text"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  placeholder="e.g. Jane Austen"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-lavender-500 focus:ring-2 focus:ring-lavender-200 outline-none transition-all bg-lavender-50/30"
                />
              </div>

              {state.error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
                  {state.error}
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-4 mt-4 text-white rounded-xl font-bold shadow-lg transform transition hover:-translate-y-0.5 ${
                  state.isOffline 
                    ? 'bg-gray-700 hover:bg-gray-800 shadow-gray-200' 
                    : 'bg-gradient-to-r from-lavender-600 to-lavender-500 hover:from-lavender-700 hover:to-lavender-600 shadow-lavender-200'
                }`}
              >
                {state.isOffline ? 'Generate from Collection' : 'Generate Greeting'}
              </button>
            </form>
          </div>
        )}

        {/* Loading State */}
        {state.isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in">
            <LoadingSpinner className="w-16 h-16 text-lavender-600 mb-6" />
            <h3 className="text-xl font-serif text-gray-700 animate-pulse">
              {state.isOffline ? "Opening the library..." : "Painting a watercolor portrait..."}
            </h3>
          </div>
        )}

        {/* Result Display */}
        {state.generatedContent && (
          <div className="flex flex-col items-center">
             <div className="mb-6 flex justify-between w-full max-w-2xl items-center">
                <button 
                  onClick={reset}
                  className="text-sm font-medium text-gray-500 hover:text-lavender-700 transition-colors flex items-center gap-1"
                >
                  ← Create Another
                </button>
                <span className="text-sm text-lavender-400 uppercase tracking-widest font-bold">Preview</span>
             </div>
             
             <ResultCanvas content={state.generatedContent} />
             
             <div className="mt-12 text-center text-gray-400 text-sm">
                <p>Generated with {state.isOffline ? 'Offline Collection' : 'Gemini API'} • {state.generatedContent.englishDate}</p>
             </div>
          </div>
        )}

      </main>

      {/* Session History Modal */}
      {showHistory && (
        <SessionHistory 
          onClose={() => setShowHistory(false)} 
          onLoadSession={handleLoadSession}
        />
      )}
    </div>
  );
};

export default App;