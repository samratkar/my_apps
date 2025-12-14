import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toJpeg } from 'html-to-image';
import { 
  Download, Image as ImageIcon, Layout, Type, Sparkles, 
  Trash2, Monitor, AlertCircle, X, PenTool, MapPin, User,
  Save, FolderOpen, Plus, Clock, FileText
} from 'lucide-react';

import RichTextToolbar from './components/RichTextToolbar';
import PoemCard from './components/PoemCard';
import { GRADIENTS } from './constants';
import { GradientTheme, UploadedImage, FontFamily, Session } from './types';
import { initDB, saveSession, getAllSessions, deleteSession, generateSessionId } from './db';

const App: React.FC = () => {
  // --- State ---
  // Defaulting to EB Garamond (LaTeX/Book style) and removing Bold tags. 
  // Changed text-align to left to fix "reversed direction" feeling of centered text.
  // Changed size from 5 to 3 for a smaller default appearance.
  const [title, setTitle] = useState('');
  // Removed hardcoded <font> tag so content inherits container font (Garamond in editor, Segoe UI in preview)
  const [content, setContent] = useState<string>('<p style="text-align: left;">Write your beautiful masterpiece here...</p>');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [activeGradient, setActiveGradient] = useState<GradientTheme>(GRADIENTS[1]); // Default to Sunset
  const [activeFont, setActiveFont] = useState<FontFamily>('EB Garamond');
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor'); // For mobile mainly

  // Signature State
  const [authorName, setAuthorName] = useState('Samrat');
  const [personName, setPersonName] = useState('');
  const [place, setPlace] = useState('Locating...');
  const [now, setNow] = useState(new Date());

  // Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- Refs ---
  const cardRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  // Initialize DB and load sessions
  useEffect(() => {
    const init = async () => {
      await initDB();
      const loadedSessions = await getAllSessions();
      setSessions(loadedSessions);
    };
    init();
  }, []);
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Geolocation Logic
  useEffect(() => {
    if (!navigator.geolocation) {
      setPlace('Earth');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use OpenStreetMap Nominatim for reverse geocoding (Free, no key required for client-side low volume)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) throw new Error('Geocoding failed');
          
          const data = await response.json();
          // Try to find the most relevant city/town name
          const locationName = 
            data.address.city || 
            data.address.town || 
            data.address.village || 
            data.address.county || 
            data.address.state || 
            "Earth";
            
          setPlace(locationName);
        } catch (error) {
          console.error("Error fetching location name:", error);
          setPlace('Earth');
        }
      },
      (error) => {
        console.warn("Geolocation permission denied or failed:", error);
        setPlace('Somewhere');
      }
    );
  }, []);

  // Format timestamp: time - day - date
  const formattedTimestamp = useMemo(() => {
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const day = now.toLocaleDateString([], { weekday: 'long' });
    const date = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    return `${time} • ${day} • ${date}`;
  }, [now]);


  // --- Handlers ---

  // Session Handlers
  const handleSaveSession = async () => {
    setIsSaving(true);
    try {
      const sessionId = currentSessionId || generateSessionId();
      const now = new Date().toISOString();
      
      const session: Session = {
        id: sessionId,
        title: title || 'Untitled',
        content: editorRef.current?.innerHTML || content,
        images,
        gradientId: activeGradient.id,
        authorName,
        personName,
        createdAt: currentSessionId ? (sessions.find(s => s.id === sessionId)?.createdAt || now) : now,
        updatedAt: now,
      };
      
      await saveSession(session);
      setCurrentSessionId(sessionId);
      
      // Refresh sessions list
      const loadedSessions = await getAllSessions();
      setSessions(loadedSessions);
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSession = (session: Session) => {
    setCurrentSessionId(session.id);
    setTitle(session.title);
    setContent(session.content);
    setImages(session.images);
    setAuthorName(session.authorName);
    setPersonName(session.personName);
    
    // Find and set gradient
    const gradient = GRADIENTS.find(g => g.id === session.gradientId);
    if (gradient) setActiveGradient(gradient);
    
    // Update editor content
    if (editorRef.current) {
      editorRef.current.innerHTML = session.content;
    }
    
    setShowSessionPanel(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
      const loadedSessions = await getAllSessions();
      setSessions(loadedSessions);
      
      // If deleting current session, clear it
      if (currentSessionId === sessionId) {
        handleNewSession();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleNewSession = () => {
    setCurrentSessionId(null);
    setTitle('');
    setContent('<p style="text-align: left;">Write your beautiful masterpiece here...</p>');
    setImages([]);
    setPersonName('');
    setActiveGradient(GRADIENTS[1]);
    
    if (editorRef.current) {
      editorRef.current.innerHTML = '<p style="text-align: left;">Write your beautiful masterpiece here...</p>';
    }
    
    setShowSessionPanel(false);
  };

  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        // Sync content immediately
        setContent(editorRef.current.innerHTML);
    }
    if (command === 'fontName' && value) {
        setActiveFont(value as FontFamily);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            url: event.target!.result as string
          }]);
        }
      };
      reader.readAsDataURL(file as Blob);
    });
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // Small delay to ensure rendering is stable (especially for fonts)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toJpeg(cardRef.current, { 
        quality: 0.95,
        pixelRatio: 2, // High resolution
        backgroundColor: '#fff' 
      });
      
      const link = document.createElement('a');
      link.download = 'sams-canvas.jpeg';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      alert('Could not export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // --- Sync editor initial content ---
  useEffect(() => {
    // Only load initial content once. 
    // We removed dangerouslySetInnerHTML from the render to prevent cursor jumping (re-render issues),
    // so we must manually set the initial HTML here.
    if (editorRef.current && !editorRef.current.innerHTML) {
        editorRef.current.innerHTML = content;
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-950">
      
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Sparkles size={20} />
            </div>
            <h1 className="text-xl font-serif font-bold text-slate-100 tracking-tight hidden sm:block">Sam's Canvas</h1>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Session Management Buttons */}
          <button
            onClick={handleNewSession}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-sm font-medium transition-colors"
            title="New Session"
          >
            <Plus size={18} />
            <span className="hidden lg:inline">New</span>
          </button>
          
          <button
            onClick={handleSaveSession}
            disabled={isSaving}
            className={`flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-medium transition-colors ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
            title="Save Session"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            <span className="hidden lg:inline">Save</span>
          </button>
          
          <button
            onClick={() => setShowSessionPanel(!showSessionPanel)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${showSessionPanel ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}
            title="Open Sessions"
          >
            <FolderOpen size={18} />
            <span className="hidden lg:inline">Sessions</span>
            {sessions.length > 0 && (
              <span className="bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{sessions.length}</span>
            )}
          </button>

          <div className="w-px h-6 bg-slate-700 hidden sm:block" />

          <button 
            onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
            className="md:hidden p-2 text-slate-400 hover:bg-slate-800 rounded-full"
          >
            {viewMode === 'editor' ? <Monitor size={20} /> : <Type size={20} />}
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-sm font-medium transition-colors"
          >
            <ImageIcon size={18} />
            <span className="hidden sm:inline">Add Photos</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />

          <button 
            onClick={downloadCard}
            disabled={isExporting}
            className={`flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-900/50 ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isExporting ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <Download size={18} />
            )}
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* Sessions Panel - Slide out */}
      {showSessionPanel && (
        <div className="absolute top-16 left-0 right-0 bg-slate-900 border-b border-slate-700 z-30 shadow-xl max-h-80 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <Clock size={18} />
                Saved Sessions
              </h2>
              <button 
                onClick={() => setShowSessionPanel(false)}
                className="p-1 hover:bg-slate-800 rounded"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            
            {sessions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No saved sessions yet. Click "Save" to save your current work.</p>
            ) : (
              <div className="grid gap-2">
                {sessions.map(session => (
                  <div 
                    key={session.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-indigo-600/20 border border-indigo-500' : 'bg-slate-800 hover:bg-slate-750 border border-transparent'}`}
                    onClick={() => handleLoadSession(session)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText size={16} className="text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-slate-100 font-medium truncate">{session.title}</p>
                        <p className="text-slate-500 text-xs">
                          {new Date(session.updatedAt).toLocaleDateString()} • {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                      className="p-2 hover:bg-red-600/20 rounded text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Delete session"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area - Split View */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Editor & Configuration */}
        <div className={`w-full md:w-1/2 flex flex-col bg-slate-900 border-r border-slate-800 transition-transform duration-300 absolute md:relative h-full z-10 ${viewMode === 'preview' ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
            
            {/* Toolbar */}
            <RichTextToolbar onCommand={handleCommand} activeFont={activeFont} />

            {/* Editable Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-900 cursor-text" onClick={() => editorRef.current?.focus()}>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onClick={(e) => e.stopPropagation()} 
                placeholder="Title of your poem..."
                className="w-full font-bold text-slate-100 placeholder:text-slate-600 bg-transparent border-none focus:ring-0 outline-none mb-4 p-0"
                style={{ fontFamily: '"Playfair Display", serif', fontSize: '20px' }}
              />
              <div 
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning={true}
                dir="ltr" 
                // Changed prose-lg to prose-sm for smaller writing area font
                className="outline-none min-h-[400px] prose prose-sm max-w-none prose-p:my-2 prose-headings:font-serif text-left prose-invert"
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                style={{ fontFamily: 'Consolas, monospace', fontSize: '14px', textAlign: 'left' }}
              />
            </div>

            {/* Signature Settings */}
            <div className="border-t border-slate-800 bg-slate-900 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-shrink-0">
                <div className="relative">
                    <PenTool size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                        type="text" 
                        value={authorName}
                        onChange={(e) => setAuthorName(e.target.value)}
                        placeholder="Author Name"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-700 bg-slate-800 text-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-500"
                    />
                </div>
                <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                        type="text" 
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        placeholder="Dedicate to..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-700 bg-slate-800 text-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-500"
                    />
                </div>
            </div>

            {/* Image Manager (Mini) */}
            {images.length > 0 && (
                <div className="h-32 border-t border-slate-800 bg-slate-900 p-4 overflow-x-auto flex gap-3 items-center flex-shrink-0">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Collage<br/>Images</span>
                    {images.map(img => (
                        <div key={img.id} className="relative group w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border border-slate-700">
                            <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                            <button 
                                onClick={() => removeImage(img.id)}
                                className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Right Side: Preview & Theme */}
        <div className={`w-full md:w-1/2 bg-slate-950 flex flex-col items-center justify-start overflow-y-auto absolute md:relative h-full transition-transform duration-300 ${viewMode === 'editor' ? 'translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
            
            {/* Theme Selector */}
            {/* Adjusted padding: pt-6 pushes it down, p-2 inside prevents ring clipping */}
            <div className="w-full pt-6 pb-4 px-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-800">
                <div className="max-w-md mx-auto">
                    <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide justify-center">
                        {GRADIENTS.map(g => (
                            <button
                                key={g.id}
                                onClick={() => setActiveGradient(g)}
                                className={`flex-shrink-0 w-8 h-8 rounded-full ring-2 ring-offset-2 transition-all ${g.classes} ${activeGradient.id === g.id ? 'ring-indigo-500 scale-110' : 'ring-transparent hover:scale-105'}`}
                                title={g.name}
                            />
                        ))}
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2 font-medium">Select a Mood</p>
                </div>
            </div>

            {/* Preview Canvas Container */}
            <div className="p-8 pb-32 w-full flex justify-center items-start min-h-full">
                <div className="scale-[0.6] md:scale-[0.65] lg:scale-[0.75] origin-top transform-gpu shadow-2xl shadow-black/50 rounded-sm">
                    {/* The Actual component to be exported */}
                    <PoemCard 
                        ref={cardRef}
                        title={title}
                        content={content} 
                        images={images} 
                        gradient={activeGradient}
                        author={authorName}
                        personName={personName}
                        place={place}
                        timestamp={formattedTimestamp}
                    />
                </div>
            </div>
        </div>

      </div>

      {/* Floating Action Button for Mobile Preview Toggle (Alternative to header) */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button 
            onClick={() => setViewMode(viewMode === 'editor' ? 'preview' : 'editor')}
            className="bg-indigo-600 text-white p-4 rounded-full shadow-xl shadow-indigo-900/50"
        >
            {viewMode === 'editor' ? <ImageIcon size={24} /> : <Type size={24} />}
        </button>
      </div>
    </div>
  );
};

export default App;