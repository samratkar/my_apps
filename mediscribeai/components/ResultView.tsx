import React, { useState } from 'react';
import { Download, FileText, Pill, MessageSquare, ArrowLeft, User, Stethoscope, Sparkles, ShieldAlert } from 'lucide-react';
import { ConsultationReport } from '../types';
import { generatePDF } from '../services/pdfService';
import Button from './Button';

interface ResultViewProps {
  report: ConsultationReport;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ report, onReset }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'insights'>('summary');

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Consultation Report</h2>
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
    </div>
  );
};

export default ResultView;