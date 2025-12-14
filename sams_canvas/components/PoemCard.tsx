import React, { forwardRef } from 'react';
import { GradientTheme, UploadedImage } from '../types';
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
}

const PoemCard = forwardRef<HTMLDivElement, PoemCardProps>(({ title, content, images, gradient, author, place, timestamp, personName }, ref) => {
  
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
    fontFamily: '"Segoe UI", sans-serif', // Force Segoe UI for preview default
    fontWeight: 'bold',
  };

  // Generate watermark pattern
  const generateWatermarks = () => {
    if (!personName) return null;
    const watermarks = [];
    // Create a grid of watermarks
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 6; col++) {
        watermarks.push(
          <div
            key={`${row}-${col}`}
            className="absolute whitespace-nowrap"
            style={{
              top: `${row * 120 - 30}px`,
              left: `${col * 250 - 100}px`,
              transform: 'rotate(-35deg)',
              fontSize: '28px',
              fontWeight: '300',
              color: 'rgba(218, 165, 32, 0.15)', // Golden color with low opacity
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

  return (
    <div 
      ref={ref}
      className={`relative w-full min-h-[800px] shadow-2xl overflow-hidden flex flex-col items-center transition-all duration-500 ${gradient.classes} ${gradient.textColor}`}
    >
      {/* Golden Watermark Layer - Behind content, not over images */}
      {personName && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          {generateWatermarks()}
        </div>
      )}

      {/* Decorative Elements */}
      <div className="absolute top-4 left-4 opacity-20 pointer-events-none z-[2]">
        <Quote size={48} className="rotate-180" />
      </div>
      <div className="absolute bottom-4 right-4 opacity-20 pointer-events-none z-[2]">
        <Quote size={48} />
      </div>

      {/* Title Banner - Full Width, Top Row */}
      {/* We render this conditionally but it occupies the top flow */}
      {title && (
        <div className="w-full relative py-12 px-8 mb-8 flex justify-center items-center z-10 text-center shadow-sm">
            {/* Banner Background: Uses current text color with low opacity for automatic theme matching */}
            <div className="absolute inset-0 bg-current opacity-10 backdrop-blur-[2px]"></div>
            <h1 
                className="relative leading-tight z-20 drop-shadow-sm" 
                style={{ fontFamily: '"Playfair Display", serif', fontWeight: '700', fontSize: '20px' }}
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
              <div className="mb-8 font-serif text-xl md:text-2xl italic opacity-80 text-center tracking-wide font-bold">
                  {personName}
              </div>
          )}

          {/* 
             Removed strict font overrides so user-selected fonts from the editor appear correctly.
             Added 'prose-headings:...' to ensure headers inside the poem look good.
             Added 'font-bold' to make the poem body bold as requested.
          */}
          <div 
            className="prose prose-lg max-w-none text-center editor-content [&_p]:m-0 font-bold"
            style={{ 
              color: 'inherit',
              ...cardStyle
            }}
            dangerouslySetInnerHTML={{ __html: content }} 
          />
        </div>

        {/* Footer / Signature Area */}
        <div className="mt-16 w-full max-w-2xl border-t border-current opacity-40 mb-6"></div>
        
        <div className="flex flex-col items-center justify-center font-[Space_Mono] text-center px-4">
          {/* Line 1: Author */}
          <div className="text-lg font-bold uppercase tracking-widest opacity-90 mb-2">
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