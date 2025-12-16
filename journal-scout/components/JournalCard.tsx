import React from 'react';
import { Journal } from '../types';
import { BookOpen, TrendingUp, Award } from 'lucide-react';

interface JournalCardProps {
  journal: Journal;
}

export const JournalCard: React.FC<JournalCardProps> = ({ journal }) => {
  const isQ1 = journal.quartile === 'Q1';

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isQ1 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
              {journal.quartile}
            </span>
            <span className="text-xs text-slate-400 font-mono">Rank #{journal.rank}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 leading-tight group-hover:text-academic-600 transition-colors">
            {journal.title}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">{journal.publisher}</p>
        </div>
        <div className="flex-shrink-0 bg-slate-50 p-2 rounded-lg text-slate-400 group-hover:text-academic-500 group-hover:bg-academic-50 transition-colors">
          <BookOpen size={20} />
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
          <p className="line-clamp-2">{journal.focusArea}</p>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-slate-500" title="Impact Factor">
            <TrendingUp size={16} className="mr-1.5 text-green-500" />
            <span>IF: <span className="font-medium text-slate-700">{journal.impactFactor || 'N/A'}</span></span>
          </div>
          <div className="flex items-center text-slate-500">
             <Award size={16} className={`mr-1.5 ${isQ1 ? 'text-amber-500' : 'text-blue-400'}`} />
             <span className="font-medium">{isQ1 ? 'Top Tier' : 'High Impact'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};