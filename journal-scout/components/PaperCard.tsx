import React from 'react';
import { Paper } from '../types';
import { FileText, Users, Calendar, Quote, Lightbulb, ExternalLink, Download } from 'lucide-react';

interface PaperCardProps {
  paper: Paper;
  index: number;
}

export const PaperCard: React.FC<PaperCardProps> = ({ paper, index }) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              #{index + 1}
            </span>
            <span className="text-xs text-academic-600 font-medium bg-academic-50 px-2 py-0.5 rounded-full">
              {paper.year}
            </span>
            {paper.arxivId && (
              <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                arXiv
              </span>
            )}
          </div>
          <h3 className="text-md font-bold text-slate-800 leading-tight mb-1">
            {paper.title}
          </h3>
          <div className="flex items-center text-xs text-slate-500 mb-2">
            <Users size={12} className="mr-1" />
            <span className="truncate max-w-[200px]">{paper.authors}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3 flex-grow">
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 italic border-l-2 border-academic-300">
          <p className="line-clamp-3">{paper.abstract}</p>
        </div>
        
        <div className="space-y-1">
             <div className="flex items-start text-xs text-slate-600">
                <Lightbulb size={12} className="mr-1.5 mt-0.5 text-amber-500 flex-shrink-0" />
                <span className="font-medium">{paper.keyFindings}</span>
             </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-mono text-academic-700 truncate max-w-[180px]">{paper.journal}</span>
        <div className="flex items-center gap-3">
          {paper.pdfUrl && (
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium transition-colors"
              title="Download PDF"
            >
              <Download size={14} />
              PDF
            </a>
          )}
          {paper.arxivUrl && (
            <a
              href={paper.arxivUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium transition-colors"
              title="View on arXiv"
            >
              <ExternalLink size={14} />
              arXiv
            </a>
          )}
          {!paper.pdfUrl && !paper.arxivUrl && (
            <div className="flex items-center" title="Citations">
              <Quote size={12} className="mr-1 text-slate-400" />
              <span>{paper.citations}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
