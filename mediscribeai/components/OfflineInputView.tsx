import React, { useState } from 'react';
import { Send, ArrowLeft, Cloud, Zap, Layers } from 'lucide-react';
import Button from './Button';
import { AnalysisMode } from '../types';

interface OfflineInputViewProps {
  onSubmit: (symptoms: string) => void;
  onCancel: () => void;
  mode: AnalysisMode;
}

const OfflineInputView: React.FC<OfflineInputViewProps> = ({ onSubmit, onCancel, mode }) => {
  const [symptoms, setSymptoms] = useState('');

  const handleSubmit = () => {
    if (symptoms.trim()) {
      onSubmit(symptoms.trim());
    }
  };

  const getModeInfo = () => {
    switch (mode) {
      case AnalysisMode.GEMINI:
        return {
          title: 'Gemini API Mode - Text Input',
          description: 'Enter consultation notes for AI-powered analysis using Gemini API.',
          icon: Cloud,
          color: 'teal'
        };
      case AnalysisMode.OFFLINE:
        return {
          title: 'Offline Mode - Text Input',
          description: 'Enter symptoms to search the offline medical research database. No API calls.',
          icon: Zap,
          color: 'indigo'
        };
      case AnalysisMode.HYBRID:
        return {
          title: 'Hybrid Mode - Text Input',
          description: 'Combines Gemini AI analysis with offline medical research database.',
          icon: Layers,
          color: 'violet'
        };
    }
  };

  const modeInfo = getModeInfo();
  const Icon = modeInfo.icon;

  return (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Icon className={`text-${modeInfo.color}-600`} size={28} />
            <h2 className="text-2xl font-bold text-slate-900">{modeInfo.title}</h2>
          </div>
          <p className="text-slate-600 text-sm">
            {modeInfo.description}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {mode === AnalysisMode.OFFLINE ? 'Symptoms or Medical Concerns' : 'Consultation Notes'}
            </label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={
                mode === AnalysisMode.OFFLINE 
                  ? "e.g., sleep apnea, anxiety, insomnia, chest pain, headaches..."
                  : "Enter patient consultation notes, symptoms, diagnosis, treatment plan..."
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={8}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-2">
              {mode === AnalysisMode.OFFLINE
                ? 'Describe the symptoms or conditions. The system will search the offline medical database for relevant research papers.'
                : 'Provide detailed consultation notes for comprehensive AI analysis.'}
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleSubmit}
              disabled={!symptoms.trim()}
              className="flex-1"
            >
              <Send className="mr-2" size={18} />
              Analyze
            </Button>
            <Button 
              onClick={onCancel}
              variant="secondary"
            >
              <ArrowLeft className="mr-2" size={18} />
              Cancel
            </Button>
          </div>
        </div>

        {mode === AnalysisMode.OFFLINE && (
          <div className="mt-8 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm text-indigo-900">
              <strong>Offline Mode:</strong> Analysis is performed using only the local medical research database. 
              No audio transcription or external API calls are made. Results are based on similarity matching 
              with research papers about sleep disorders, anxiety, and other conditions in the database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineInputView;
