import React, { forwardRef, useState, useEffect, useCallback } from 'react';
import { GradientTheme, UploadedImage, FontFamily } from '../types';
import { Quote } from 'lucide-react';

interface PoemCardProps {
  title: string;
  content: string; // HTML string
  images: UploadedImage[];
  gradient: GradientTheme;
  author: string;
  place: string;
  timestamp: string;
  personName: string;
  imageBgColor: string;
  headingRibbonColor?: string;
  headingTextColor?: string;
  headingFont?: FontFamily;
}

const PoemCard = forwardRef<HTMLDivElement, PoemCardProps>(({ 
  title, 
  content, 
  images, 
  gradient, 
  author, 
  place, 
  timestamp, 
  personName, 
  imageBgColor,
  headingRibbonColor = '#a855f7',
  headingTextColor = '#ffffff',
  headingFont = 'Cinzel'
}, ref) => {
  const [containerSize, setContainerSize] = useState({ width: 800, height: 800 });
  
  // Grid calculation based on image count
  const getGridClass = (count: number) => {
    if (count === 0) return 'hidden';
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-2'; // First takes full width? handled below
    return 'grid-cols-2 md:grid-cols-3';
  };

  // Helper to force styles on the content if needed, but we mostly respect rich text now
  const cardStyle = {
    fontFamily: '"Lora", serif',
    fontWeight: 'normal',
    fontStyle: 'italic',
    color: '#7e22ce', // lavender-700
  };

  // Update container size using ResizeObserver
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    
    const updateSize = () => {
      setContainerSize({
        width: node.offsetWidth || 800,
        height: node.offsetHeight || 800
      });
    };
    
    // Initial measurement
    updateSize();
    
    // Observe size changes
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(node);
    
    return () => resizeObserver.disconnect();
  }, []);

  // Combine refs
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    // Set the forwarded ref
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
    // Set measurement ref
    measureRef(node);
  }, [ref, measureRef]);

  // Generate watermark pattern dynamically based on container size
  const generateWatermarks = () => {
    if (!personName) return null;
    
    const watermarks = [];
    const rowSpacing = 80;
    const colSpacing = 150;
    
    // Calculate rows and columns based on actual container size
    const rows = Math.ceil((containerSize.height + 100) / rowSpacing) + 2;
    const cols = Math.ceil((containerSize.width + 200) / colSpacing) + 2;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        watermarks.push(
          <div
            key={`${row}-${col}`}
            className="absolute whitespace-nowrap"
            style={{
              top: `${row * rowSpacing - 30}px`,
              left: `${col * colSpacing - 100}px`,
              transform: 'rotate(-35deg)',
              fontSize: '24px',
              fontWeight: '300',
              color: 'rgba(218, 165, 32, 0.12)', // Golden color with low opacity
              fontFamily: '"Georgia", serif',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {personName}
          </div>
        );
      }
    }
    return watermarks;
  };

  // Check if using custom image color (no gradient classes)
  const useCustomBgColor = gradient.id === 'image-color' && imageBgColor;

  return (
    <div 
      ref={setRefs}
      className={`relative w-full min-h-[800px] shadow-2xl overflow-hidden flex flex-col items-center transition-all duration-500 ${gradient.classes} ${gradient.textColor}`}
      style={useCustomBgColor ? { backgroundColor: imageBgColor } : undefined}
    >
      {/* Golden Watermark Layer - Behind content, not over images */}
      {personName && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          {generateWatermarks()}
        </div>
      )}

      {/* Decorative Elements */}
      <div className="absolute top-4 left-4 opacity-20 pointer-events-none z-[20]">
        <Quote size={48} className="rotate-180" />
      </div>
      <div className="absolute bottom-4 right-4 opacity-20 pointer-events-none z-[20]">
        <Quote size={48} />
      </div>

      {/* Title Banner - Full Width, Top Row */}
      {/* We render this conditionally but it occupies the top flow */}
      {title && (
        <div 
          className="w-full relative py-4 px-8 mb-4 flex justify-center items-center z-10 text-center shadow-sm backdrop-blur-sm"
          style={{ backgroundColor: `${headingRibbonColor}33` }}
        >
            <h1 
                className="relative leading-tight z-20 drop-shadow-sm" 
                style={{ 
                  fontFamily: `"${headingFont}", serif`, 
                  fontWeight: '700', 
                  fontSize: '20px',
                  color: headingTextColor
                }}
            >
                {title}
            </h1>
        </div>
      )}

      {/* Main Content Wrapper (Images + Poem + Footer) */}
      <div className={`w-full flex-1 flex flex-col items-center px-12 pb-12 z-[5] ${!title ? 'pt-12' : ''}`}>

        {/* Image Collage Section - Higher z-index to be above watermark */}
        {images.length > 0 && (
          <div className={`relative z-[10] w-full max-w-4xl grid gap-4 mb-12 ${getGridClass(images.length)} items-start`}>
            {images.map((img, index) => {
              const isFeatured = images.length === 3 && index === 0;
              return (
                <div 
                  key={img.id} 
                  className={`relative overflow-hidden rounded-lg shadow-md group ${isFeatured ? 'col-span-2' : ''}`}
                  style={{ backgroundColor: imageBgColor }}
                >
                  <img 
                    src={img.url} 
                    alt="Collage element" 
                    className="w-full h-auto block transform transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Poem Content Section */}
        {/* Changed justify-center to justify-start to align text to top, not center vertically */}
        <div className="relative w-full max-w-3xl flex-grow flex flex-col justify-start items-center">
          
          {/* Person / Dedication */}
          {personName && (
              <div className="mb-8 text-xl md:text-2xl opacity-80 text-center tracking-wide" style={{ color: '#a855f7', fontFamily: '"Alex Brush", cursive' }}>
                  {personName}
              </div>
          )}

          {/* 
             Using Lora font with normal weight and lavender color.
          */}
          <div 
            className="prose prose-lg max-w-none text-center editor-content [&_p]:m-0"
            style={{ 
              ...cardStyle
            }}
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        </div>

        {/* Footer / Signature Area */}
        <div className="mt-16 w-full max-w-2xl border-t border-current opacity-40 mb-6"></div>
        
        <div className="flex flex-col items-center justify-center font-[Space_Mono] text-center px-4">
          {/* Line 1: Author */}
          <div className="text-lg font-bold uppercase tracking-widest opacity-90 mb-2" style={{ color: '#a855f7' }}>
              {author}
          </div>
          
          {/* Line 2: Time - Day - Date - Place */}
          <div className="text-xs md:text-sm font-medium opacity-60 flex flex-wrap justify-center gap-x-2">
              <span>{timestamp}</span>
              <span>•</span>
              <span>{place}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

PoemCard.displayName = 'PoemCard';

export default PoemCard;