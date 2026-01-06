import React, { useState } from 'react';
import { KeyIcon } from './Icons';

interface ApiKeyModalProps {
  onSubmit: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSubmit }) => {
  const [inputKey, setInputKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      onSubmit(inputKey.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-lavender-200">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-lavender-100 rounded-full mb-4">
            <KeyIcon className="w-8 h-8 text-lavender-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-800 text-center">Enter Gemini API Key</h2>
          <p className="text-gray-500 text-center mt-2 text-sm">
            To generate beautiful watercolor cards, we need your Google Gemini API key. It is used locally and never stored.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              id="apiKey"
              required
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lavender-500 focus:border-lavender-500 outline-none transition-all"
              placeholder="AIzaSy..."
            />
          </div>
          <button
            type="submit"
            disabled={!inputKey.trim()}
            className="w-full py-3 px-4 bg-lavender-600 hover:bg-lavender-700 disabled:bg-lavender-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2"
          >
            Start Creating
          </button>
        </form>
        <p className="mt-4 text-xs text-center text-gray-400">
          Need a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-lavender-600 hover:underline">Get one from Google AI Studio</a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeyModal;
