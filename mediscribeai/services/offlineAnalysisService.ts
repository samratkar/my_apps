/**
 * Offline Analysis Service
 * Provides medical insights using only the vector database (no API calls)
 */

import { AIAnalysisResult } from '../types';
import { searchVectorDatabase, VectorDatabase, loadVectorDatabase } from './vectorDBService';
import { transcribeAudio } from './speechToTextService';

// Cache for loaded vector database
let vectorDB: VectorDatabase | null = null;

/**
 * Analyze audio using offline speech-to-text and vector database
 * No API calls - purely offline analysis
 */
export const analyzeOfflineAudio = async (audioBlob: Blob): Promise<AIAnalysisResult> => {
  console.log('Performing offline audio analysis with local Whisper transcription');

  try {
    // Load vector DB if not already loaded
    if (!vectorDB) {
      console.log('Loading medical papers vector database...');
      // Use relative path that works with Vite's base configuration
      const dbPath = `${import.meta.env.BASE_URL || '/'}vectordb/vectordb.json`;
      console.log('Vector DB path:', dbPath);
      vectorDB = await loadVectorDatabase(dbPath);
      console.log(`Loaded ${vectorDB.documents.length} medical papers`);
    }

    // Transcribe audio locally using Whisper
    console.log('Transcribing audio with offline Whisper model...');
    const transcription = await transcribeAudio(audioBlob);
    console.log('Transcription complete:', transcription);

    // Check if transcription contains only non-speech markers
    const nonSpeechPatterns = /^\s*(\[.*?\]|\(.*?\)|\[MUSIC.*?\]|\[.*?PLAYING.*?\]|buzzing|music)\s*$/i;
    if (nonSpeechPatterns.test(transcription) || transcription.length < 10) {
      console.warn('Transcription appears to be non-speech or too short');
      return {
        summary: 'Recording Issue Detected\n\nThe audio recording did not contain clear speech. Please ensure:\n1. Your microphone is working and selected correctly\n2. You are speaking clearly into the microphone\n3. There is no background noise or music playing\n\nTranscription received: "' + transcription + '"',
        transcript: [
          {
            speaker: 'System',
            text: 'No clear speech detected. Transcription: "' + transcription + '"'
          },
          {
            speaker: 'Troubleshooting',
            text: 'Please check: 1) Microphone permissions in browser, 2) Correct microphone selected, 3) Microphone volume, 4) Speak clearly during recording'
          }
        ],
        prescriptions: [],
        medicalInsights: {
          possibleDiagnosis: [],
          prevention: ['Ensure microphone is working before recording'],
          treatment: [],
          recommendedMedicines: [],
          lifestyleChanges: []
        },
      };
    }

    // Use transcription as symptoms for search
    const searchResults = await searchVectorDatabase(transcription, vectorDB, 5);
    console.log(`Found ${searchResults.length} relevant papers for transcribed content`);

    // Extract insights from papers
    const insights = extractInsightsFromPapers(searchResults, transcription);

    const vectorDBInsights = searchResults.map(result => ({
      title: result.document.metadata.title || result.document.fileName,
      relevance: result.score,
      excerpt: result.document.content.slice(0, 500)
    }));

    return {
      summary: `Offline Analysis (Local Whisper Transcription + Vector DB)\n\nTranscribed Content: "${transcription.slice(0, 200)}${transcription.length > 200 ? '...' : ''}"\n\nAnalysis performed using offline speech-to-text and local medical research database. Found ${searchResults.length} relevant research papers.`,
      transcript: [
        {
          speaker: 'Transcribed Audio (Offline)',
          text: transcription
        },
        {
          speaker: 'System',
          text: 'Offline mode: Audio transcribed using local Whisper model. Analysis based on vector database search. No external API calls made.'
        }
      ],
      prescriptions: [],
      medicalInsights: insights,
      vectorDBInsights: vectorDBInsights.length > 0 ? vectorDBInsights : undefined
    };
  } catch (error) {
    console.error('Offline audio analysis failed:', error);
    throw new Error(`Offline analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. No API calls were made - this is a local processing error.`);
  }
};

/**
 * Analyze text symptoms using only offline vector database
 * No API calls - purely offline analysis
 */
export const analyzeOfflineText = async (symptoms: string): Promise<AIAnalysisResult> => {
  console.log('[OfflineAnalysis] Starting offline text analysis for:', symptoms);

  try {
    // Load vector DB if not already loaded
    if (!vectorDB) {
      console.log('[OfflineAnalysis] Vector DB not loaded, loading now...');
      // Use relative path that works with Vite's base configuration
      const dbPath = `${import.meta.env.BASE_URL || '/'}vectordb/vectordb.json`;
      console.log('[OfflineAnalysis] Vector DB path:', dbPath);
      try {
        vectorDB = await loadVectorDatabase(dbPath);
        console.log(`[OfflineAnalysis] Successfully loaded ${vectorDB.documents.length} medical papers`);
      } catch (dbError) {
        console.error('[OfflineAnalysis] Failed to load vector database:', dbError);
        throw new Error(`Vector database failed to load: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }
    } else {
      console.log('[OfflineAnalysis] Using cached vector DB with', vectorDB.documents.length, 'papers');
    }

    // Search vector DB with user's symptoms
    console.log('[OfflineAnalysis] Searching vector DB...');
    const searchResults = await searchVectorDatabase(symptoms, vectorDB, 5);
    console.log(`[OfflineAnalysis] Found ${searchResults.length} relevant papers for symptoms`);

    // Extract insights from papers
    const insights = extractInsightsFromPapers(searchResults, symptoms);

    const vectorDBInsights = searchResults.map(result => ({
      title: result.document.metadata.title || result.document.fileName,
      relevance: result.score,
      excerpt: result.document.content.slice(0, 500)
    }));

    console.log('[OfflineAnalysis] Analysis complete, returning results');
    return {
      summary: `Offline Analysis based on symptoms: "${symptoms}"\n\nAnalysis performed using local medical research database. Found ${searchResults.length} relevant research papers. See detailed insights below.`,
      transcript: [
        {
          speaker: 'Patient Input',
          text: symptoms
        },
        {
          speaker: 'System',
          text: 'Offline mode: Analysis based on vector database search of medical research papers. No external API calls made.'
        }
    ],
    prescriptions: [],
    medicalInsights: insights,
    vectorDBInsights: vectorDBInsights.length > 0 ? vectorDBInsights : undefined
  };
  } catch (error) {
    console.error('[OfflineAnalysis] Offline text analysis failed:', error);
    throw new Error(`Offline analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. No API calls were made - this is a local processing error.`);
  }
};



/**
 * Extract medical insights from vector DB search results
 */
function extractInsightsFromPapers(results: any[], symptoms?: string): any {
  if (results.length === 0) {
    return {
      possibleDiagnosis: 'No relevant research papers found. Please check vector database.',
      prevention: ['Ensure vector database is properly loaded'],
      treatment: ['Switch to Hybrid or Gemini mode for AI-powered analysis'],
      recommendedMedicines: ['Consult medical professional'],
      lifestyleChanges: ['Regular health checkups recommended']
    };
  }

  // Extract common topics from papers
  const contents = results.map(r => r.document.content.toLowerCase()).join(' ');
  
  const prevention: string[] = [];
  const treatment: string[] = [];
  const medicines: string[] = [];
  const lifestyle: string[] = [];
  
  // Sleep-related insights
  if (contents.includes('sleep') || contents.includes('apnea')) {
    prevention.push('Maintain regular sleep schedule');
    prevention.push('Create comfortable sleep environment');
    treatment.push('Sleep hygiene practices');
    treatment.push('Continuous positive airway pressure (CPAP) for sleep apnea');
    lifestyle.push('Avoid caffeine and alcohol before bedtime');
    lifestyle.push('Regular exercise (but not close to bedtime)');
    medicines.push('Melatonin supplements (consult doctor)');
  }
  
  // Anxiety-related insights
  if (contents.includes('anxiety') || contents.includes('stress')) {
    prevention.push('Stress management techniques');
    prevention.push('Regular physical activity');
    treatment.push('Cognitive behavioral therapy (CBT)');
    treatment.push('Relaxation and mindfulness practices');
    lifestyle.push('Regular meditation or yoga');
    lifestyle.push('Limit caffeine and sugar intake');
    medicines.push('Anxiolytic medications (prescription required)');
  }

  // Ensure we have some generic advice if nothing specific found
  if (prevention.length === 0) {
    prevention.push('Maintain healthy lifestyle');
    prevention.push('Regular medical checkups');
  }
  if (treatment.length === 0) {
    treatment.push('Consult healthcare provider for proper diagnosis');
    treatment.push('Follow evidence-based treatment protocols');
  }
  if (lifestyle.length === 0) {
    lifestyle.push('Balanced diet and regular exercise');
    lifestyle.push('Adequate sleep and stress management');
  }
  if (medicines.length === 0) {
    medicines.push('Consult physician for appropriate medications');
  }

  // Create diagnosis based on top matching papers
  let diagnosis = 'Based on research papers: ';
  if (results.length > 0) {
    const topPaper = results[0].document.metadata.title || 'medical research';
    const relevance = (results[0].score * 100).toFixed(0);
    diagnosis += `Findings related to ${topPaper} (${relevance}% match). `;
  }
  if (symptoms) {
    diagnosis += `Analyzed symptoms: ${symptoms}. `;
  }
  diagnosis += 'See research insights below for detailed information from ${results.length} relevant papers.';

  return {
    possibleDiagnosis: diagnosis,
    prevention,
    treatment,
    recommendedMedicines: medicines,
    lifestyleChanges: lifestyle
  };
}
