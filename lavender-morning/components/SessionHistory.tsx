import React, { useState, useEffect } from 'react';
import { SavedSession } from '../types';
import { getAllSessions, deleteSession, copyToClipboard } from '../services/sessionStorage';
import { HistoryIcon, TrashIcon, CopyIcon, DownloadIcon, CheckIcon, EyeIcon } from './Icons';
import { GeneratedContent } from '../types';

interface SessionHistoryProps {
  onClose: () => void;
  onLoadSession?: (content: GeneratedContent) => void;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ onClose, onLoadSession }) => {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const allSessions = await getAllSessions();
      setSessions(allSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleCopy = async (session: SavedSession) => {
    const quoteText = `"${session.content.quote}"\n— ${session.content.author}${session.content.book ? ` (${session.content.book})` : ''}`;
    const success = await copyToClipboard(quoteText);
    if (success) {
      setCopiedId(session.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleView = (session: SavedSession) => {
    if (onLoadSession) {
      onLoadSession(session.content);
      onClose();
    }
  };

  const handleExportJpg = (session: SavedSession) => {
    // Create a temporary canvas to regenerate the full-quality image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    
    // Handle Offline (URL) vs Online (Base64)
    if (session.content.isOffline) {
      img.src = session.content.imageSource;
    } else {
      const mimeType = session.content.imageMimeType || 'image/jpeg';
      img.src = `data:${mimeType};base64,${session.content.imageSource}`;
    }
    
    img.onload = () => {
      const canvasWidth = 1080;
      const canvasHeight = 1680;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // 1. Draw Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Frame
      const frameWidth = 20;
      ctx.strokeStyle = '#f3e8ff';
      ctx.lineWidth = frameWidth;
      ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

      // 2. Draw Image 
      const imgMargin = 40;
      const imgSize = 1000; 
      
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 15;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(imgMargin, imgMargin, imgSize, imgSize);
      ctx.restore();

      const sWidth = img.naturalWidth;
      const sHeight = img.naturalHeight;
      const size = Math.min(sWidth, sHeight);
      const sx = (sWidth - size) / 2;
      const sy = (sHeight - size) / 2;

      ctx.drawImage(img, sx, sy, size, size, imgMargin, imgMargin, imgSize, imgSize);

      // 3. Typography Section
      const textStartY = imgMargin + imgSize + 100;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 100px "Cinzel"';
      ctx.fillStyle = '#581c87'; 
      ctx.fillText('Good Morning', canvasWidth / 2, textStartY);

      const quoteY = textStartY + 100;
      
      const drawWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, font: string, color: string) => {
        ctx.font = font;
        ctx.fillStyle = color;
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            lines.push(line);
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        for (let k = 0; k < lines.length; k++) {
          ctx.fillText(lines[k], x, y + (k * lineHeight));
        }
        return lines.length * lineHeight;
      };

      const quoteHeight = drawWrappedText(
        `"${session.content.quote}"`, 
        canvasWidth / 2, 
        quoteY, 
        920, 
        70, 
        'italic 600 48px "Crimson Text"', 
        '#4a044e' 
      );

      const authorY = quoteY + quoteHeight + 50;
      ctx.font = '300 35px "Lato"';
      ctx.fillStyle = '#7e22ce';
      
      let authorLine = `— ${session.content.author}`;
      if (session.content.book) {
        authorLine += ` (${session.content.book})`;
      }
      ctx.fillText(authorLine, canvasWidth / 2, authorY);

      const dividerY = canvasHeight - 150;
      ctx.beginPath();
      ctx.moveTo(300, dividerY);
      ctx.lineTo(canvasWidth - 300, dividerY);
      ctx.strokeStyle = '#d8b4fe';
      ctx.lineWidth = 3; 
      ctx.stroke();

      const dateY = canvasHeight - 80;
      const dateText = `${session.content.englishDate}  •  ${session.content.hinduDate}`;
      ctx.font = 'bold 36px "Lato"'; 
      ctx.fillStyle = '#581c87'; 
      ctx.fillText(dateText, canvasWidth / 2, dateY);

      // Download
      const link = document.createElement('a');
      link.download = `morning-greeting-${session.timestamp}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    };
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-lavender-100 flex items-center justify-between bg-gradient-to-r from-lavender-50 to-white">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-lavender-600" />
            <h2 className="text-2xl font-serif font-bold text-lavender-900">Saved Sessions</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none px-2"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lavender-600 text-lg">Loading sessions...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No saved sessions yet.</p>
              <p className="text-gray-400 text-sm mt-2">Create a greeting and click "Save Session" to store it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="bg-white border-2 border-lavender-100 rounded-xl p-4 hover:shadow-lg transition-all hover:border-lavender-200"
                >
                  {/* Thumbnail */}
                  {session.thumbnailUrl && (
                    <div className="mb-3 rounded-lg overflow-hidden">
                      <img 
                        src={session.thumbnailUrl} 
                        alt="Session thumbnail"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}

                  {/* Quote Preview */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-700 italic line-clamp-2">
                      "{session.content.quote}"
                    </p>
                    <p className="text-xs text-lavender-600 font-semibold mt-1">
                      — {session.content.author}
                    </p>
                  </div>

                  {/* Date */}
                  <p className="text-xs text-gray-400 mb-3">
                    {formatDate(session.timestamp)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleView(session)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-lavender-600 hover:bg-lavender-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      <EyeIcon className="w-3.5 h-3.5" />
                      View
                    </button>

                    <button
                      onClick={() => handleCopy(session)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-lavender-50 hover:bg-lavender-100 text-lavender-700 rounded-lg font-semibold transition-colors"
                    >
                      {copiedId === session.id ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleExportJpg(session)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white hover:bg-gray-50 text-lavender-700 border border-lavender-200 rounded-lg font-semibold transition-colors"
                    >
                      <DownloadIcon className="w-3.5 h-3.5" />
                      JPG
                    </button>

                    <button
                      onClick={() => handleDelete(session.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition-colors ml-auto"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;
