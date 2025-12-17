import React, { useState } from 'react';
import { Download, FileText, Pill, MessageSquare, ArrowLeft, User, Stethoscope, Sparkles, ShieldAlert, Zap, Cloud, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { ConsultationReport, AnalysisMode } from '../types';
import { generatePDF } from '../services/pdfService';
import Button from './Button';

interface ResultViewProps {
  report: ConsultationReport;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ report, onReset }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'insights'>('summary');
  const [expandedInsights, setExpandedInsights] = useState<Set<number>>(new Set());
  const [selectedPaper, setSelectedPaper] = useState<{title: string, relevance: number, excerpt: string} | null>(null);

  const toggleInsight = (index: number) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedInsights(newExpanded);
  };

  const openPaperModal = (insight: {title: string, relevance: number, excerpt: string}) => {
    setSelectedPaper(insight);
  };

  const closePaperModal = () => {
    setSelectedPaper(null);
  };

  const getModeIcon = () => {
    switch (report.analysisMode) {
      case AnalysisMode.GEMINI:
        return <Cloud size={16} className="inline" />;
      case AnalysisMode.OFFLINE:
        return <Zap size={16} className="inline" />;
      case AnalysisMode.HYBRID:
        return <Layers size={16} className="inline" />;
    }
  };

  const getModeLabel = () => {
    switch (report.analysisMode) {
      case AnalysisMode.GEMINI:
        return 'Gemini API';
      case AnalysisMode.OFFLINE:
        return 'Offline';
      case AnalysisMode.HYBRID:
        return 'Hybrid';
    }
  };

  const getModeColor = () => {
    switch (report.analysisMode) {
      case AnalysisMode.GEMINI:
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case AnalysisMode.OFFLINE:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case AnalysisMode.HYBRID:
        return 'bg-violet-50 text-violet-700 border-violet-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Consultation Report
            <span className={`text-xs px-3 py-1 rounded-full border ${getModeColor()}`}>
              {getModeIcon()} <span className="ml-1">{getModeLabel()}</span>
            </span>
          </h2>
          <p className="text-slate-500 text-sm">Date: {report.consultationDate}</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary" onClick={onReset}>
            <ArrowLeft size={18} className="mr-2" />
            New Session
          </Button>
          <Button onClick={() => generatePDF(report)}>
            <Download size={18} className="mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Patient/Doctor Details Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col sm:flex-row gap-6">
        <div className="flex items-center gap-3">
            <div className="bg-teal-50 p-3 rounded-full text-teal-600">
                <Stethoscope size={20} />
            </div>
            <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Doctor</p>
                <p className="font-medium text-slate-900">{report.doctorName}</p>
            </div>
        </div>
        <div className="hidden sm:block w-px bg-slate-200"></div>
        <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-3 rounded-full text-indigo-600">
                <User size={20} />
            </div>
            <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Patient</p>
                <p className="font-medium text-slate-900">{report.patientName}</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'summary' 
                  ? 'border-teal-600 text-teal-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center">
                <FileText size={16} className="mr-2" />
                Clinical Summary
              </div>
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'insights' 
                  ? 'border-violet-600 text-violet-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center">
                <Sparkles size={16} className="mr-2" />
                AI Analysis
              </div>
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'transcript' 
                  ? 'border-teal-600 text-teal-700' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center">
                <MessageSquare size={16} className="mr-2" />
                Full Transcript
              </div>
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
            {activeTab === 'summary' && (
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {report.summary}
                </p>
              </div>
            )}

            {activeTab === 'transcript' && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {report.transcript.map((line, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      line.speaker.toLowerCase().includes('doctor') ? 'text-teal-600' : 'text-indigo-600'
                    }`}>
                      {line.speaker}
                    </span>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg text-sm leading-relaxed">
                      {line.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="space-y-6">
                <div className="bg-violet-50 p-4 rounded-lg border border-violet-100 flex items-start gap-3">
                   <ShieldAlert className="text-violet-600 flex-shrink-0 mt-0.5" size={20} />
                   <p className="text-xs text-violet-800">
                     <strong>AI Disclaimer:</strong> This section is generated by AI based on the consultation context. It is for informational purposes only and should not replace professional medical advice.
                   </p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Possible Diagnosis</h4>
                  <p className="text-slate-800 text-lg font-medium">{report.medicalInsights.possibleDiagnosis}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-3 flex items-center">
                       Prevention
                     </h4>
                     <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                       {report.medicalInsights.prevention.map((item, i) => (
                         <li key={i}>{item}</li>
                       ))}
                     </ul>
                   </div>
                   <div>
                     <h4 className="text-sm font-bold text-blue-700 uppercase tracking-wide mb-3 flex items-center">
                       Treatment & Cure
                     </h4>
                     <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                       {report.medicalInsights.treatment.map((item, i) => (
                         <li key={i}>{item}</li>
                       ))}
                     </ul>
                   </div>
                   <div>
                     <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wide mb-3 flex items-center">
                       Recommended Medicines (AI)
                     </h4>
                     <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                       {report.medicalInsights.recommendedMedicines.map((item, i) => (
                         <li key={i}>{item}</li>
                       ))}
                     </ul>
                   </div>
                   <div>
                     <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-3 flex items-center">
                       Lifestyle Changes
                     </h4>
                     <ul className="list-disc pl-5 space-y-1 text-slate-700 text-sm">
                       {report.medicalInsights.lifestyleChanges.map((item, i) => (
                         <li key={i}>{item}</li>
                       ))}
                     </ul>
                   </div>
                </div>

                {/* Insights from offline research */}
                {report.vectorDBInsights && report.vectorDBInsights.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wide mb-4 flex items-center">
                      <FileText size={16} className="mr-2" />
                      Insights from offline research ({report.vectorDBInsights.length} papers)
                    </h4>
                    <div className="space-y-3">
                      {report.vectorDBInsights.map((insight, i) => (
                        <div 
                          key={i} 
                          className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 hover:border-indigo-400 transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">
                                  {(insight.relevance * 100).toFixed(1)}% match
                                </span>
                              </div>
                              <button
                                onClick={() => openPaperModal(insight)}
                                className="text-left hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded"
                              >
                                <h5 className="text-sm font-bold text-indigo-900 hover:text-indigo-600 transition-colors">
                                  {insight.title} →
                                </h5>
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                            {insight.excerpt.slice(0, 200)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Prescriptions */}
        <div className="lg:col-span-1">
          <div className="bg-teal-50 rounded-xl p-6 border border-teal-100 sticky top-6">
            <div className="flex items-center mb-4 text-teal-800">
              <Pill size={20} className="mr-2" />
              <h3 className="font-bold text-lg">Prescriptions</h3>
            </div>
            
            {report.prescriptions.length === 0 ? (
              <p className="text-sm text-teal-600 italic">No prescriptions detected in this session.</p>
            ) : (
              <ul className="space-y-4">
                {report.prescriptions.map((rx, idx) => (
                  <li key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-teal-100">
                    <div className="font-bold text-slate-900">{rx.medicine}</div>
                    <div className="text-sm text-slate-600 mt-1">{rx.dosage}</div>
                    <div className="text-xs text-slate-400 mt-2 italic">{rx.instructions}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* Modal for Paper Details */}
      {selectedPaper && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closePaperModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-indigo-600 text-white p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={20} />
                    <span className="text-xs font-semibold bg-indigo-500 px-2 py-0.5 rounded-full">
                      {(selectedPaper.relevance * 100).toFixed(1)}% relevance
                    </span>
                  </div>
                  <h3 className="text-xl font-bold leading-tight">
                    {selectedPaper.title}
                  </h3>
                </div>
                <button
                  onClick={closePaperModal}
                  className="ml-4 text-white hover:bg-indigo-500 rounded-full p-2 transition-colors"
                  aria-label="Close modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)] custom-scrollbar">
              <div className="prose prose-slate max-w-none">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedPaper.excerpt}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
              <Button variant="secondary" onClick={closePaperModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultView;
