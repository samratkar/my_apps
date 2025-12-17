/**
 * Speech-to-Text Service using Whisper (Transformers.js)
 * Runs entirely in the browser - no API calls!
 */

import { pipeline } from '@xenova/transformers';

/**
 * Resample audio to target sample rate (Whisper needs 16kHz)
 */
async function resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<Float32Array> {
  const offlineContext = new OfflineAudioContext(
    1, // mono
    audioBuffer.duration * targetSampleRate,
    targetSampleRate
  );
  
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  
  const resampledBuffer = await offlineContext.startRendering();
  return resampledBuffer.getChannelData(0);
}

// Singleton pipeline instance
let whisperPipeline: any = null;
let pipelineLoading: Promise<any> | null = null;

/**
 * Get or initialize the Whisper speech recognition pipeline
 * Downloads model on first use (~150MB for tiny model), then cached in browser
 */
export const getWhisperPipeline = async (
  onProgress?: (progress: { status: string; progress?: number }) => void
): Promise<any> => {
  if (whisperPipeline) {
    return whisperPipeline;
  }

  if (pipelineLoading) {
    return pipelineLoading;
  }

  console.log('Loading Whisper model for offline speech recognition...');
  
  // Using whisper-tiny for faster performance and smaller size
  pipelineLoading = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
    progress_callback: onProgress,
  });

  whisperPipeline = await pipelineLoading;
  pipelineLoading = null;
  
  console.log('Whisper model loaded successfully');
  return whisperPipeline;
};

/**
 * Transcribe audio to text using local Whisper model
 * No API key required - runs entirely in browser!
 */
export const transcribeAudio = async (
  audioBlob: Blob,
  onProgress?: (progress: { status: string; progress?: number }) => void
): Promise<string> => {
  try {
    console.log('Starting offline audio transcription...');
    console.log('Audio blob size:', audioBlob.size, 'bytes, type:', audioBlob.type);
    
    // Get the Whisper pipeline
    const transcriber = await getWhisperPipeline(onProgress);
    
    // Decode audio blob to raw audio samples for Whisper
    // Whisper expects audio data, not a raw blob
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    console.log('Audio ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');
    
    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log('Decoded audio:', {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length
    });
    
    // Whisper expects 16kHz audio - resample if needed
    let audioData: Float32Array;
    if (audioBuffer.sampleRate !== 16000) {
      console.log('Resampling audio from', audioBuffer.sampleRate, 'Hz to 16000 Hz');
      audioData = await resampleAudio(audioBuffer, 16000);
      console.log('Resampled audio samples:', audioData.length);
    } else {
      audioData = audioBuffer.getChannelData(0);
    }
    
    console.log('Audio samples:', audioData.length);
    
    // Calculate audio statistics to check if there's actual audio content
    let sum = 0;
    let maxAmplitude = 0;
    for (let i = 0; i < audioData.length; i++) {
      const abs = Math.abs(audioData[i]);
      sum += abs;
      if (abs > maxAmplitude) maxAmplitude = abs;
    }
    const averageAmplitude = sum / audioData.length;
    
    console.log('Audio analysis:', {
      averageAmplitude,
      maxAmplitude,
      duration: audioBuffer.duration + 's'
    });
    
    if (audioData.length === 0) {
      console.warn('No audio data in the buffer');
      return 'No audio data detected. Please try recording again.';
    }
    
    // Check if audio is too quiet (might indicate microphone issue)
    if (maxAmplitude < 0.01) {
      console.warn('Audio level too low - microphone might not be working');
      return 'Audio level too low. Please check your microphone and try again speaking louder.';
    }
    
    // Transcribe the audio using the decoded samples
    const result = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });
    
    console.log('Whisper raw result:', result);
    console.log('Result type:', typeof result);
    console.log('Result keys:', result ? Object.keys(result) : 'null');
    console.log('Result.text:', result?.text);
    console.log('Result as string:', String(result));
    
    // Try different ways to extract the transcription
    let transcriptionText = '';
    if (typeof result === 'string') {
      transcriptionText = result;
    } else if (result && typeof result === 'object') {
      transcriptionText = result.text || result.transcription || result[0]?.text || '';
    }
    
    console.log('Extracted transcription:', transcriptionText);
    
    if (!transcriptionText || !transcriptionText.trim()) {
      console.warn('Empty transcription - audio might be silent or unclear');
      console.warn('Full result object:', JSON.stringify(result, null, 2));
      return 'No clear speech detected in the recording. Please try again speaking clearly into the microphone.';
    }
    
    return transcriptionText.trim();
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Transcribe audio with timestamps for detailed transcript
 */
export const transcribeAudioWithTimestamps = async (
  audioBlob: Blob,
  onProgress?: (progress: { status: string; progress?: number }) => void
): Promise<{ text: string; chunks: Array<{ timestamp: [number, number]; text: string }> }> => {
  try {
    console.log('Starting offline audio transcription with timestamps...');
    
    const transcriber = await getWhisperPipeline(onProgress);
    
    // Decode audio blob to raw audio samples
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const audioData = audioBuffer.getChannelData(0);
    
    const result = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    });
    
    console.log('Transcription with timestamps completed');
    return {
      text: result.text || '',
      chunks: result.chunks || []
    };
  } catch (error) {
    console.error('Error transcribing audio with timestamps:', error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
  }
};
