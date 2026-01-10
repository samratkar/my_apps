import React, { useRef, useEffect, useState } from 'react';
import { GeneratedContent } from '../types';
import { DownloadIcon, CopyIcon, SaveIcon, CheckIcon } from './Icons';
import { copyToClipboard, saveSession } from '../services/sessionStorage';

interface ResultCanvasProps {
  content: GeneratedContent;
}

const ResultCanvas: React.FC<ResultCanvasProps> = ({ content }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Wait for fonts to load
    const loadFonts = async () => {
      await document.fonts.load('700 100px "Cinzel"');
      await document.fonts.load('48px "Lora"');
      await document.fonts.load('300 35px "Lato"');
      await document.fonts.load('bold 36px "Lato"');
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    // Handle Offline (URL) vs Online (Base64)
    if (content.isOffline) {
       img.src = content.imageSource;
    } else {
       const mimeType = content.imageMimeType || 'image/jpeg';
       img.src = `data:${mimeType};base64,${content.imageSource}`;
    }
    
    img.onload = async () => {
      await loadFonts();
      const canvasWidth = 1080;
      const canvasHeight = 1680;
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Extract dominant color from image
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        let r = 0, g = 0, b = 0;
        const step = 4 * 10; // Sample every 10th pixel for performance
        let count = 0;
        for (let i = 0; i < data.length; i += step) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        
        const dominantColor = `rgb(${r}, ${g}, ${b})`;
        
        // Calculate brightness to determine text color
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const textColor = '#000000';
        const accentColor = '#333333';

        // 1. Draw Background - white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Frame
        const frameWidth = 20;
        ctx.strokeStyle = '#e9d5ff'; // light lavender
        ctx.lineWidth = frameWidth;
        ctx.strokeRect(0, 0, canvasWidth, canvasHeight);

      // 2. Draw Image 
      const imgMargin = 40;
      const imgSize = 1000;

      // Draw the actual image (Contain - scale to fit entire image in panel)
      const sWidth = img.naturalWidth;
      const sHeight = img.naturalHeight;
      
      // Calculate scale to fit entire image in panel
      const scale = Math.min(imgSize / sWidth, imgSize / sHeight);
      
      const drawWidth = sWidth * scale;
      const drawHeight = sHeight * scale;
      
      // Center the image in the panel
      const drawX = imgMargin + (imgSize - drawWidth) / 2;
      const drawY = imgMargin + (imgSize - drawHeight) / 2;

      ctx.drawImage(img, 0, 0, sWidth, sHeight, drawX, drawY, drawWidth, drawHeight);

      // 3. Typography Section
      const textStartY = imgMargin + imgSize + 100;

      // "Good Morning" - lighter lavender
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 100px "Cinzel", serif';
      ctx.fillStyle = '#c084fc'; // lavender-400 (lighter lavender)
      ctx.fillText('Good Morning', canvasWidth / 2, textStartY);

      // Quote
      const quoteY = textStartY + 100;
      const dividerY = canvasHeight - 150;
      const authorHeight = 50; // Space for author line
      const padding = 50; // Padding between author and divider
      
      // Available space for quote and author
      const availableSpace = dividerY - quoteY - authorHeight - padding;
      
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
      
      // Dynamically determine font size based on quote length and available space
      const calculateOptimalFontSize = (text: string, maxWidth: number, availableHeight: number) => {
        let fontSize = 48; // Start with default
        let lineHeight = 70;
        let testHeight = 0;
        
        // Test font sizes from 48px down to 28px
        for (let size = 48; size >= 28; size -= 2) {
          lineHeight = size * 1.45; // Proportional line height
          ctx.font = `italic ${size}px "Lora", serif`;
          
          const words = text.split(' ');
          let line = '';
          let lineCount = 0;

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
              lineCount++;
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lineCount++; // Add last line
          
          testHeight = lineCount * lineHeight;
          
          if (testHeight <= availableHeight) {
            fontSize = size;
            break;
          }
        }
        
        return { fontSize, lineHeight };
      };
      
      const { fontSize, lineHeight } = calculateOptimalFontSize(`${content.quote}`, 920, availableSpace);

      // Quote: Elegant Lora font with dynamic size
      const quoteHeight = drawWrappedText(
        `${content.quote}`, 
        canvasWidth / 2, 
        quoteY, 
        920, 
        lineHeight, 
        `${fontSize}px "Lora", serif`, 
        '#7D8F69'
      );

      // Author & Book Name Combined on One Line
      const authorY = quoteY + quoteHeight + 50;
      ctx.font = '300 35px "Lato", sans-serif'; // Light weight
      ctx.fillStyle = '#a855f7'; // lavender
      
      let authorLine = `— ${content.author}`;
      if (content.book) {
        authorLine += ` (${content.book})`;
      }
      ctx.fillText(authorLine, canvasWidth / 2, authorY);

      // Divider Line
      ctx.beginPath();
      ctx.moveTo(300, dividerY);
      ctx.lineTo(canvasWidth - 300, dividerY);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 3; 
      ctx.stroke();

      // Date
      const dateY = canvasHeight - 80;
      const dateText = `${content.englishDate}  •  ${content.hinduDate}`;
      ctx.font = '28px "Lato", sans-serif'; 
      ctx.fillStyle = '#BBBBBB'; // lighter grey 
      ctx.fillText(dateText, canvasWidth / 2, dateY);

      setIsReady(true);
      
      // Auto-save session after canvas is ready
      setTimeout(() => {
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.3);
        saveSession(content, thumbnailUrl).catch(err => {
          console.error('Auto-save failed:', err);
        });
      }, 100);
      }
    };

    img.onerror = () => {
        console.error("Failed to load image for canvas");
    }

  }, [content]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `morning-greeting-${Date.now()}.jpg`;
    link.href = canvasRef.current.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  const handleCopyQuote = async () => {
    const quoteText = `"${content.quote}"\n— ${content.author}${content.book ? ` (${content.book})` : ''}`;
    const success = await copyToClipboard(quoteText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveSession = async () => {
    if (!canvasRef.current) return;
    try {
      const thumbnailUrl = canvasRef.current.toDataURL('image/jpeg', 0.3); // Lower quality for thumbnail
      await saveSession(content, thumbnailUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
      <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-white bg-white">
        <canvas 
          ref={canvasRef} 
          className="max-w-full h-auto max-h-[70vh] w-auto"
          style={{ width: '100%', height: 'auto' }}
        />
      </div>
      
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={handleCopyQuote}
          disabled={!isReady}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-lavender-50 text-lavender-700 border-2 border-lavender-200 rounded-full font-bold shadow-md transform transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? <CheckIcon className="w-5 h-5 text-green-600" /> : <CopyIcon className="w-5 h-5" />}
          {copied ? 'Copied!' : 'Copy Quote'}
        </button>

        <button
          onClick={handleSaveSession}
          disabled={!isReady}
          className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-lavender-50 text-lavender-700 border-2 border-lavender-200 rounded-full font-bold shadow-md transform transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saved ? <CheckIcon className="w-5 h-5 text-green-600" /> : <SaveIcon className="w-5 h-5" />}
          {saved ? 'Saved!' : 'Save Session'}
        </button>

        <button
          onClick={handleDownload}
          disabled={!isReady}
          className="flex items-center gap-2 px-6 py-3 bg-lavender-600 hover:bg-lavender-700 text-white rounded-full font-bold shadow-lg transform transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DownloadIcon className="w-5 h-5" />
          Export as JPG
        </button>
      </div>
    </div>
  );
};

export default ResultCanvas;