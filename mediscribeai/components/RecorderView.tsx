import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, AlertCircle } from 'lucide-react';
import Button from './Button';

interface RecorderViewProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
}

const RecorderView: React.FC<RecorderViewProps> = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Audio Visualization Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecordingResources = () => {
    // Stop Media Recorder tracks
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    // Cleanup Audio Context
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
    }
    
    // Stop Animation Frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (timerRef.current) clearInterval(timerRef.current);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // --- Setup MediaRecorder ---
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        stopRecordingResources();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // --- Setup Visualizer ---
      setupVisualizer(stream);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const setupVisualizer = (stream: MediaStream) => {
    if (!canvasRef.current) return;

    // Create Audio Context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    // Increase fftSize for higher resolution time-domain data (smoother wave)
    analyser.fftSize = 2048; 
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const draw = () => {
      if (!canvasRef.current) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Clear Canvas
      ctx.fillStyle = 'rgb(248 250 252)'; // slate-50 to match bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(13, 148, 136)'; // teal-600
      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  };

  const handleStopClick = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCancelClick = () => {
    stopRecordingResources();
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-red-500 bg-red-50 p-4 rounded-full">
          <AlertCircle size={48} />
        </div>
        <p className="text-center text-slate-700">{error}</p>
        <Button onClick={onCancel} variant="secondary">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-500 w-full max-w-2xl mx-auto">
      
      <div className="relative mb-6">
        <div className="relative bg-red-500 text-white p-6 rounded-full shadow-lg shadow-red-200 z-10">
          <Mic size={40} className="animate-pulse" />
        </div>
      </div>

      <h2 className="text-4xl font-mono font-bold text-slate-800 mb-2">{formatTime(duration)}</h2>
      <p className="text-slate-500 mb-8 font-medium">Recording in progress...</p>

      {/* Visualizer Container */}
      <div className="w-full h-32 bg-slate-50 rounded-xl border border-slate-200 mb-10 overflow-hidden relative shadow-inner">
         {/* Canvas */}
         <canvas 
            ref={canvasRef}
            width={600}
            height={128}
            className="w-full h-full z-10 relative"
         />
         
         {/* Medical Grid Background Effect */}
         <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
              style={{
                backgroundImage: 'linear-gradient(#0f766e 1px, transparent 1px), linear-gradient(90deg, #0f766e 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}>
         </div>
      </div>

      <div className="flex space-x-4">
        <Button 
          onClick={handleStopClick} 
          variant="danger" 
          className="px-8 py-3 text-lg shadow-md hover:shadow-lg transform transition-all active:scale-95"
        >
          <Square className="mr-2" size={20} fill="currentColor" />
          End Session
        </Button>
      </div>
      
      <button 
        onClick={handleCancelClick}
        className="mt-8 text-sm text-slate-400 hover:text-slate-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

export default RecorderView;