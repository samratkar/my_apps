import React, { useState, useRef, useEffect, useMemo } from 'react';
import { toJpeg } from 'html-to-image';
import { 
  Download, Image as ImageIcon, Layout, Type, Sparkles, 
  Trash2, Monitor, AlertCircle, X, PenTool, MapPin, User,
  Save, FolderOpen, Plus, Clock, FileText, Palette, Instagram
} from 'lucide-react';

import RichTextToolbar from './components/RichTextToolbar';
import PoemCard from './components/PoemCard';
import { GRADIENTS } from './constants';
import { GradientTheme, UploadedImage, FontFamily, Session } from './types';
import { initDB, saveSession, getAllSessions, deleteSession, generateSessionId } from './db';

// Helper function to extract dominant color from an image
const extractDominantColor = (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#ffffff');
        return;
      }
      
      // Sample a smaller version for performance
      const sampleSize = 50;
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      
      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
      let r = 0, g = 0, b = 0, count = 0;
      
      // Average all pixels
      for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i];
        g += imageData[i + 1];
        b += imageData[i + 2];
        count++;
      }
      
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      resolve(hex);
    };
    img.onerror = () => resolve('#ffffff');
    img.src = imageUrl;
  });
};

// Helper to determine if a color is light or dark
const isLightColor = (hex: string): boolean => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

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
  const [imageDominantColor, setImageDominantColor] = useState<string | null>(null);
  const [imageBgColor, setImageBgColor] = useState('#ffffff');

  // Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Closing Stanza Toggle
  const [includeClosingStanza, setIncludeClosingStanza] = useState(false);
  const closingStanza = `<p style="text-align: left;"><br></p><p style="text-align: left;">Here I stand in love's refrain</p><p style="text-align: left;">Through joy and loss, through peace and pain</p><p style="text-align: left;">I had loved you; I love you still.</p><p style="text-align: left;">And loved you, love you, always will.</p>`;

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

  // Keyboard shortcut: Ctrl+Shift+P to toggle closing stanza
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIncludeClosingStanza(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        imageBgColor,
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

  const handleLoadSession = async (session: Session) => {
    setCurrentSessionId(session.id);
    setTitle(session.title);
    setContent(session.content);
    setImages(session.images);
    setAuthorName(session.authorName);
    setPersonName(session.personName);
    setImageBgColor(session.imageBgColor || '#ffffff');
    
    // Extract dominant color from first image if exists
    if (session.images.length > 0) {
      const dominantColor = await extractDominantColor(session.images[0].url);
      setImageDominantColor(dominantColor);
    } else {
      setImageDominantColor(null);
    }
    
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
    setImageBgColor('#ffffff');
    setImageDominantColor(null);
    
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

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const imageUrl = event.target!.result as string;
          
          // Extract dominant color from the first image
          if (images.length === 0) {
            const dominantColor = await extractDominantColor(imageUrl);
            setImageDominantColor(dominantColor);
          }
          
          setImages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            url: imageUrl
          }]);
        }
      };
      reader.readAsDataURL(file as Blob);
    });
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    const newImages = images.filter(img => img.id !== id);
    setImages(newImages);
    
    // If all images removed, reset dominant color
    if (newImages.length === 0) {
      setImageDominantColor(null);
    } else {
      // Recalculate from first remaining image
      extractDominantColor(newImages[0].url).then(setImageDominantColor);
    }
  };

  // Apply image dominant color to card background
  const applyImageColorToBackground = () => {
    if (!imageDominantColor) return;
    
    const textColor = isLightColor(imageDominantColor) ? 'text-slate-900' : 'text-slate-100';
    
    // Create a custom gradient theme from the dominant color
    const customGradient: GradientTheme = {
      id: 'image-color',
      name: 'Image Color',
      classes: '', // Will use inline style instead
      textColor: textColor,
    };
    
    setActiveGradient(customGradient);
    setImageBgColor(imageDominantColor);
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // Small delay to ensure rendering is stable (especially for fonts)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use the image background color if image-color theme is selected, otherwise white
      const bgColor = activeGradient.id === 'image-color' && imageBgColor ? imageBgColor : '#fff';
      
      const dataUrl = await toJpeg(cardRef.current, { 
        quality: 0.95,
        pixelRatio: 2, // High resolution
        backgroundColor: bgColor 
      });
      
      // Generate filename from title, sanitizing for file system
      const sanitizedTitle = title
        ? title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'sams-canvas'
        : 'sams-canvas';
      
      const link = document.createElement('a');
      link.download = `${sanitizedTitle}.jpeg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
      alert('Could not export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export for Instagram (1080x1350 - 4:5 portrait ratio, max allowed)
  const downloadForInstagram = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const bgColor = activeGradient.id === 'image-color' && imageBgColor ? imageBgColor : '#fff';
      
      // First capture at high resolution
      const dataUrl = await toJpeg(cardRef.current, { 
        quality: 0.95,
        pixelRatio: 3,
        backgroundColor: bgColor 
      });
      
      // Instagram optimal dimensions (4:5 portrait - maximum height ratio)
      const INSTA_WIDTH = 1080;
      const INSTA_HEIGHT = 1350;
      
      // Create canvas for Instagram dimensions
      const canvas = document.createElement('canvas');
      canvas.width = INSTA_WIDTH;
      canvas.height = INSTA_HEIGHT;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Fill background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);
      
      // Load the captured image
      const img = new Image();
      img.src = dataUrl;
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      
      // Calculate scaling to FIT entire image within Instagram dimensions (no cropping)
      const imgAspect = img.width / img.height;
      const instaAspect = INSTA_WIDTH / INSTA_HEIGHT;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imgAspect > instaAspect) {
        // Image is wider than Instagram frame - constrain by width
        drawWidth = INSTA_WIDTH;
        drawHeight = INSTA_WIDTH / imgAspect;
      } else {
        // Image is taller than Instagram frame - constrain by height
        drawHeight = INSTA_HEIGHT;
        drawWidth = INSTA_HEIGHT * imgAspect;
      }
      
      // Center the image on the canvas
      offsetX = (INSTA_WIDTH - drawWidth) / 2;
      offsetY = (INSTA_HEIGHT - drawHeight) / 2;
      
      // Fill background with the image's dominant color or white
      ctx.fillStyle = imageBgColor || '#ffffff';
      ctx.fillRect(0, 0, INSTA_WIDTH, INSTA_HEIGHT);
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      
      // Export
      const instaDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      
      const sanitizedTitle = title
        ? title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase() || 'sams-canvas'
        : 'sams-canvas';
      
      const link = document.createElement('a');
      link.download = `${sanitizedTitle}-instagram.jpeg`;
      link.href = instaDataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export for Instagram', err);
      alert('Could not export for Instagram. Please try again.');
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
          
          <button 
            onClick={downloadForInstagram}
            disabled={isExporting}
            className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-pink-900/50 ${isExporting ? 'opacity-70 cursor-wait' : ''}`}
            title="Export for Instagram (1080x1350)"
          >
            {isExporting ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <Instagram size={18} />
            )}
            <span className="hidden lg:inline">Insta</span>
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
                style={{ fontFamily: '"Cinzel", serif', fontSize: '20px' }}
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
                    <div className="flex gap-2 overflow-x-auto p-2 scrollbar-hide justify-center items-center">
                        {GRADIENTS.map(g => (
                            <button
                                key={g.id}
                                onClick={() => setActiveGradient(g)}
                                className={`flex-shrink-0 w-8 h-8 rounded-full ring-2 ring-offset-2 transition-all ${g.classes} ${activeGradient.id === g.id ? 'ring-indigo-500 scale-110' : 'ring-transparent hover:scale-105'}`}
                                title={g.name}
                            />
                        ))}
                        
                        {/* Separator */}
                        <div className="w-px h-6 bg-slate-600 mx-1 flex-shrink-0" />
                        
                        {/* Image Dominant Color - Apply to Card Background */}
                        <button
                            onClick={applyImageColorToBackground}
                            disabled={!imageDominantColor}
                            className={`flex-shrink-0 w-8 h-8 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 transition-all flex items-center justify-center ${
                              imageDominantColor 
                                ? `${activeGradient.id === 'image-color' ? 'ring-amber-500 scale-110' : 'ring-transparent hover:scale-105 hover:ring-amber-500/50'} cursor-pointer` 
                                : 'ring-transparent opacity-40 cursor-not-allowed'
                            }`}
                            style={{ backgroundColor: imageDominantColor || '#374151' }}
                            title={imageDominantColor ? 'Apply image color to card background' : 'Add an image to use its color'}
                        >
                            <Palette size={14} className={imageDominantColor && !isLightColor(imageDominantColor) ? 'text-white/60' : 'text-slate-600/60'} />
                        </button>
                    </div>
                    <p className="text-center text-xs text-slate-400 mt-2 font-medium">Select a Mood {imageDominantColor && <span>• <span className="text-amber-400">Image Color</span></span>}</p>
                </div>
            </div>

            {/* Preview Canvas Container */}
            <div className="p-8 pb-32 w-full flex justify-center items-start min-h-full">
                <div className="scale-[0.6] md:scale-[0.65] lg:scale-[0.75] origin-top transform-gpu shadow-2xl shadow-black/50 rounded-sm">
                    {/* The Actual component to be exported */}
                    <PoemCard 
                        ref={cardRef}
                        title={title}
                        content={includeClosingStanza ? content + closingStanza : content} 
                        images={images} 
                        gradient={activeGradient}
                        author={authorName}
                        personName={personName}
                        place={place}
                        timestamp={formattedTimestamp}
                        imageBgColor={imageBgColor}
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