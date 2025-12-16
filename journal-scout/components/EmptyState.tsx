import React from 'react';
import { Search, FolderDown } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="bg-academic-50 p-6 rounded-full mb-6">
        <FolderDown className="w-12 h-12 text-academic-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-3">Research Paper Scout</h2>
      <p className="text-slate-500 max-w-md leading-relaxed">
        Enter your research area to identify <strong>50 seminal and high-impact papers</strong>. 
        Automatically create a local catalogue and save detailed summaries to your desktop.
      </p>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full text-left">
        {[
          { icon: <Search className="w-5 h-5" />, title: "Deep Search", desc: "Retrieves 50 influential papers" },
          { icon: <div className="font-bold text-lg leading-none">AI</div>, title: "Smart Summaries", desc: "Key findings & abstracts" },
          { icon: <FolderDown className="w-5 h-5" />, title: "Auto Save", desc: "Downloads files & catalogue" }
        ].map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
            <div className="text-academic-500 mb-2">{item.icon}</div>
            <h3 className="font-semibold text-slate-800 text-sm">{item.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
