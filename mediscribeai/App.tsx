import React, { useState, useEffect } from 'react';
import { Mic, Activity, HeartPulse, Settings, LogOut, Key } from 'lucide-react';
import RecorderView from './components/RecorderView';
import ResultView from './components/ResultView';
import DetailsInputView from './components/DetailsInputView';
import ApiKeyInputView from './components/ApiKeyInputView';
import OfflineInputView from './components/OfflineInputView';
import Button from './components/Button';
import { analyzeConsultationAudio, analyzeConsultationText, blobToBase64 } from './services/geminiService';
import { analyzeOfflineAudio, analyzeOfflineText } from './services/offlineAnalysisService';
import { AppState, ConsultationReport, AnalysisMode } from './types';

function App() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [report, setReport] = useState<ConsultationReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState({ doctorName: '', patientName: '' });
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(AnalysisMode.HYBRID);
  const [inputMode, setInputMode] = useState<'audio' | 'text'>('audio');

  // Load API key from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
  };

  const handleChangeApiKey = () => {
    if (window.confirm("This will remove your API key from browser storage. You will need to enter it again to use the app.")) {
      localStorage.removeItem('gemini_api_key');
      setApiKey(null);
      setAppState(AppState.IDLE);
      setReport(null);
    }
  };

  const handleStartSession = () => {
    setAppState(AppState.DETAILS_INPUT);
    setErrorMsg(null);
  };

  const handleDetailsSubmit = (doctorName: string, patientName: string) => {
    setSessionDetails({ doctorName, patientName });
    setAppState(AppState.RECORDING);
  };

  const handleTextSubmit = async (text: string) => {
    setAppState(AppState.PROCESSING);
    
    try {
      let analysis;
      
      // Offline mode - use local vector DB only
      if (analysisMode === AnalysisMode.OFFLINE) {
        console.log('[App] Starting offline text analysis');
        analysis = await analyzeOfflineText(text);
        console.log('[App] Offline text analysis complete');
      } else {
        // Gemini/Hybrid modes - use API
        if (!apiKey) {
          setErrorMsg("API Key missing. Please configure your settings or use Offline mode.");
          setAppState(AppState.ERROR);
          return;
        }
        
        console.log(`[App] Starting ${analysisMode} text analysis`);
        // Use text analysis function
        analysis = await analyzeConsultationText(
          text,
          sessionDetails.doctorName,
          sessionDetails.patientName,
          apiKey,
          analysisMode
        );
        console.log('[App] API text analysis complete');
      }
      
      const finalReport: ConsultationReport = {
        ...analysis,
        doctorName: sessionDetails.doctorName,
        patientName: sessionDetails.patientName,
        consultationDate: new Date().toLocaleDateString(),
        analysisMode: analysisMode,
      };

      console.log('[App] Setting report and transitioning to VIEWING state');
      setReport(finalReport);
      setAppState(AppState.VIEWING);
    } catch (err) {
      console.error('[App] Text analysis error:', err);
      setAppState(AppState.ERROR);
      
      if (analysisMode === AnalysisMode.OFFLINE) {
        setErrorMsg(`Offline text analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
      } else {
        setErrorMsg(`Failed to analyze text. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setAppState(AppState.PROCESSING);
    
    try {
      // Offline mode - use local speech-to-text and vector DB
      if (analysisMode === AnalysisMode.OFFLINE) {
        const analysis = await analyzeOfflineAudio(audioBlob);
        
        const finalReport: ConsultationReport = {
          ...analysis,
          doctorName: sessionDetails.doctorName,
          patientName: sessionDetails.patientName,
          consultationDate: new Date().toLocaleDateString(),
          analysisMode: AnalysisMode.OFFLINE,
        };

        setReport(finalReport);
        setAppState(AppState.VIEWING);
        return;
      }

      // Gemini/Hybrid modes - require API key
      if (!apiKey) {
        setErrorMsg("API Key missing. Please configure your settings or use Offline mode.");
        setAppState(AppState.ERROR);
        return;
      }

      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);
      
      // Analyze with selected mode
      const analysis = await analyzeConsultationAudio(
        base64Audio, 
        audioBlob.type,
        sessionDetails.doctorName,
        sessionDetails.patientName,
        apiKey,
        analysisMode
      );
      
      const finalReport: ConsultationReport = {
        ...analysis,
        doctorName: sessionDetails.doctorName,
        patientName: sessionDetails.patientName,
        consultationDate: new Date().toLocaleDateString(),
        analysisMode: analysisMode,
      };

      setReport(finalReport);
      setAppState(AppState.VIEWING);
    } catch (err) {
      console.error('Analysis error:', err);
      setAppState(AppState.ERROR);
      
      // Different error messages based on mode
      if (analysisMode === AnalysisMode.OFFLINE) {
        setErrorMsg("Offline analysis failed. Please check console for details or try again.");
      } else {
        setErrorMsg("Failed to analyze the consultation. Please check your API key and try again.");
      }
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setReport(null);
    setErrorMsg(null);
    setSessionDetails({ doctorName: '', patientName: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-100 flex flex-col">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-600">
            <HeartPulse size={28} strokeWidth={2.5} />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">MediScribe<span className="text-teal-600">AI</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-xs font-medium text-slate-400 border border-slate-200 rounded-full px-3 py-1">
              Gemini 2.5 Powered
            </div>
            {apiKey && (
              <button 
                onClick={handleChangeApiKey}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                title="Change API Key"
              >
                <Settings size={18} />
                <span className="hidden sm:inline text-sm font-medium">Change Key</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
        
        {!apiKey ? (
          <ApiKeyInputView onSave={handleSaveApiKey} />
        ) : (
          <>
            {appState === AppState.IDLE && (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-teal-50 p-6 rounded-full mb-8">
                  <Activity className="h-16 w-16 text-teal-600" />
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                  Intelligent Medical Documentation
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mb-10 leading-relaxed">
                  Record your patient consultation and let AI instantly generate a clinical summary, detailed transcript, and prescription list.
                </p>
                {/* Mode Selector */}
                <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl">
                  <h3 className="text-sm font-bold text-slate-700 mb-4">Analysis Mode</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setAnalysisMode(AnalysisMode.GEMINI)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        analysisMode === AnalysisMode.GEMINI
                          ? 'border-teal-600 bg-teal-50 text-teal-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">Gemini API</div>
                      <div className="text-xs mt-1 opacity-75">AI-powered analysis</div>
                    </button>
                    <button
                      onClick={() => setAnalysisMode(AnalysisMode.OFFLINE)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        analysisMode === AnalysisMode.OFFLINE
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">Offline</div>
                      <div className="text-xs mt-1 opacity-75">Research papers only</div>
                    </button>
                    <button
                      onClick={() => setAnalysisMode(AnalysisMode.HYBRID)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        analysisMode === AnalysisMode.HYBRID
                          ? 'border-violet-600 bg-violet-50 text-violet-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-sm">Hybrid</div>
                      <div className="text-xs mt-1 opacity-75">AI + Research</div>
                    </button>
                  </div>
                </div>

                <Button 
                  onClick={handleStartSession} 
                  className="px-8 py-4 text-lg rounded-full shadow-lg shadow-teal-600/20 hover:shadow-teal-600/40 transform hover:-translate-y-1 transition-all"
                >
                  <Mic className="mr-2" />
                  Start New Session
                </Button>

                <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left w-full max-w-4xl">
                  {[
                    { title: "Secure Recording", desc: "Browser-based capture ensuring local control before processing." },
                    { title: "Smart Summary", desc: "Gemini 2.5 extracts key symptoms, diagnoses, and plans." },
                    { title: "Instant Export", desc: "Generate professional PDFs for patient records immediately." }
                  ].map((feature, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                      <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-500">{feature.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-16 text-sm text-slate-400 flex items-center gap-2">
                  <Key size={14} />
                  <span>Using locally stored API Key.</span>
                  <button 
                    onClick={handleChangeApiKey} 
                    className="text-teal-600 hover:text-teal-700 underline font-medium"
                  >
                    Change Key
                  </button>
                </div>
              </div>
            )}

            {appState === AppState.DETAILS_INPUT && (
              <DetailsInputView 
                onSubmit={handleDetailsSubmit} 
                onCancel={handleReset} 
              />
            )}

            {appState === AppState.RECORDING && (
              <div className="w-full max-w-3xl mx-auto">
                {/* Input Mode Toggle */}
                <div className="mb-6 flex gap-2 justify-center">
                  <button
                    onClick={() => setInputMode('audio')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      inputMode === 'audio'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mic size={18} />
                      <span>Audio Recording</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setInputMode('text')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      inputMode === 'text'
                        ? 'bg-teal-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity size={18} />
                      <span>Text Input</span>
                    </div>
                  </button>
                </div>

                {inputMode === 'audio' ? (
                  <RecorderView 
                    onRecordingComplete={handleRecordingComplete} 
                    onCancel={handleReset} 
                  />
                ) : (
                  <OfflineInputView 
                    onSubmit={handleTextSubmit} 
                    onCancel={handleReset}
                    mode={analysisMode}
                  />
                )}
              </div>
            )}

            {appState === AppState.PROCESSING && (
              <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-in fade-in duration-700">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full border-4 border-slate-100 border-t-teal-600 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="h-8 w-8 text-teal-600 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900">Analyzing Consultation</h3>
                  <p className="text-slate-500 mt-2">
                    {analysisMode === AnalysisMode.OFFLINE 
                      ? 'Transcribing audio with local Whisper model and searching medical database...'
                      : 'Transcribing audio and extracting clinical data...'}
                  </p>
                  {analysisMode === AnalysisMode.OFFLINE && (
                    <p className="text-xs text-indigo-600 mt-2">First run: Downloading Whisper model (~150MB, cached for future use)</p>
                  )}
                </div>
              </div>
            )}

            {appState === AppState.ERROR && (
              <div className="flex flex-col items-center justify-center py-20 space-y-6">
                <div className="bg-red-50 p-4 rounded-full text-red-600">
                  <Activity size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Analysis Failed</h3>
                <p className="text-slate-500 max-w-md text-center">{errorMsg}</p>
                <div className="flex gap-4">
                  <Button onClick={handleReset} variant="secondary">Go Home</Button>
                  <Button onClick={handleChangeApiKey} variant="ghost">Change API Key</Button>
                </div>
              </div>
            )}

            {appState === AppState.VIEWING && report && (
              <ResultView report={report} onReset={handleReset} />
            )}
          </>
        )}
      </main>

    </div>
  );
}

export default App;