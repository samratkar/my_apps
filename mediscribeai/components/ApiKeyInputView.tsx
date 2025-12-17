import React, { useState } from 'react';
import { Key, ArrowRight, ExternalLink, ShieldCheck } from 'lucide-react';
import Button from './Button';

interface ApiKeyInputViewProps {
  onSave: (key: string) => void;
}

const ApiKeyInputView: React.FC<ApiKeyInputViewProps> = ({ onSave }) => {
  const [inputKey, setInputKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      onSave(inputKey.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in zoom-in duration-500">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-teal-50 p-4 rounded-full">
            <Key className="h-8 w-8 text-teal-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">Configure API Key</h2>
        <p className="text-slate-500 text-center mb-6 text-sm">
          To use MediScribe AI, you need a Google Gemini API key. Your key is stored locally in your browser and never sent to our servers.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 mb-2">
              Gemini API Key
            </label>
            <input
              type="password"
              id="apiKey"
              className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition-colors"
              placeholder="Enter your API key here..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={!inputKey.trim()}
          >
            Save Key <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100">
          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            Get an API Key from Google AI Studio
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-3 w-3" />
            <span>Secure Local Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInputView;