import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIAnalysisResult, AnalysisMode } from "../types";
import { loadVectorDatabase, searchVectorDatabase, extractRelevantContext, VectorDatabase } from './vectorDBService';

const modelName = "gemini-2.5-flash";

// Cache for loaded vector database (only for hybrid mode)
let vectorDB: VectorDatabase | null = null;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A professional medical summary of the consultation, highlighting key symptoms, diagnosis, and plan.",
    },
    transcript: {
      type: Type.ARRAY,
      description: "A detailed transcript of the conversation.",
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: {
            type: Type.STRING,
            description: "The speaker, e.g., 'Doctor', 'Patient', or name if identified.",
          },
          text: {
            type: Type.STRING,
            description: "The spoken text.",
          },
        },
        required: ["speaker", "text"],
      },
    },
    prescriptions: {
      type: Type.ARRAY,
      description: "List of medications prescribed or recommended by the doctor.",
      items: {
        type: Type.OBJECT,
        properties: {
          medicine: { type: Type.STRING, description: "Name of the medication" },
          dosage: { type: Type.STRING, description: "Dosage information" },
          instructions: { type: Type.STRING, description: "How to take the medication" },
        },
        required: ["medicine", "dosage", "instructions"],
      },
    },
    medicalInsights: {
      type: Type.OBJECT,
      description: "AI expert analysis based on the patient's reported symptoms and condition.",
      properties: {
        possibleDiagnosis: { type: Type.STRING, description: "Possible medical diagnosis based on the symptoms discussed." },
        prevention: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "List of preventative measures for this condition." 
        },
        treatment: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "List of potential cures or treatment plans." 
        },
        recommendedMedicines: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "List of standard medicines often used for this condition (general medical knowledge)." 
        },
        lifestyleChanges: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING }, 
          description: "List of recommended lifestyle changes." 
        },
      },
      required: ["possibleDiagnosis", "prevention", "treatment", "recommendedMedicines", "lifestyleChanges"],
    },
  },
  required: ["summary", "transcript", "prescriptions", "medicalInsights"],
};

export const analyzeConsultationAudio = async (
  base64Audio: string, 
  mimeType: string,
  doctorName: string,
  patientName: string,
  apiKey: string | null,
  mode: AnalysisMode = AnalysisMode.HYBRID
): Promise<AIAnalysisResult> => {
  console.log(`[GeminiService] Starting audio analysis in ${mode} mode`);
  
  // Offline mode should NOT call this function - it's handled separately
  if (mode === AnalysisMode.OFFLINE) {
    throw new Error('Offline mode should use analyzeOfflineAudio directly, not geminiService');
  }

  try {
    // Gemini API or Hybrid mode - require API key
    if (!apiKey) {
      throw new Error('API key required for Gemini and Hybrid modes');
    }
    
    const genAI = new GoogleGenAI({ apiKey });
    
    // Load vector DB only for hybrid mode (NOT for Gemini mode)
    if (mode === AnalysisMode.HYBRID && !vectorDB) {
      console.log('[GeminiService] Loading medical papers vector database for hybrid mode...');
      // Use relative path that works with Vite's base configuration
      const dbPath = `${import.meta.env.BASE_URL || '/'}vectordb/vectordb.json`;
      console.log('[GeminiService] Vector DB path:', dbPath);
      try {
        vectorDB = await loadVectorDatabase(dbPath);
        console.log(`[GeminiService] Loaded ${vectorDB.documents.length} medical papers`);
      } catch (dbError) {
        console.error('[GeminiService] Failed to load vector database:', dbError);
        console.warn('[GeminiService] Continuing without vector DB in hybrid mode');
      }
    } else if (mode === AnalysisMode.HYBRID && vectorDB) {
      console.log('[GeminiService] Using cached vector DB with', vectorDB.documents.length, 'papers');
    }

    // First, do a preliminary transcription to extract symptoms for vector search
    let medicalContext = '';
    let vectorDBResults: any[] = [];
    try {
      // For hybrid mode, search vector DB
      if (mode === AnalysisMode.HYBRID && vectorDB) {
        // Get preliminary transcript to extract symptoms
        const prelimResponse = await genAI.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Audio,
                },
              },
              {
                text: `Extract the main medical symptoms, conditions, or health concerns mentioned in this consultation. 
                Provide a brief comma-separated list of key medical terms only.`,
              },
            ],
          },
          config: {
            temperature: 0.1,
          },
        });

        const symptomsText = prelimResponse.text || '';
        console.log('Extracted symptoms for vector search:', symptomsText);

        // Search vector database for relevant medical papers
        if (symptomsText.trim()) {
          const searchResults = await searchVectorDatabase(symptomsText, vectorDB, 3);
          console.log(`Found ${searchResults.length} relevant medical papers`);
          
          vectorDBResults = searchResults;
          medicalContext = extractRelevantContext(searchResults);
          console.log('Medical context extracted from papers');
        }
      }
    } catch (vectorError) {
      console.warn('Vector DB search failed, continuing without medical papers:', vectorError);
      // Continue without vector context if it fails
    }

    // Now do the full analysis with augmented context
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio,
            },
          },
          {
            text: `You are an expert medical scribe and AI medical consultant. 
            Analyze the attached audio recording of a consultation between Doctor ${doctorName} and Patient ${patientName}.
            
            ${medicalContext ? `The following relevant medical research has been identified:\n${medicalContext}\n\nUse this research to enhance your analysis where appropriate, but rely primarily on general medical knowledge and the consultation content.` : ''}
            
            1. Generate a concise but comprehensive clinical summary.
            2. Transcribe the conversation accurately. Automatically identify speakers based on context (Doctor vs Patient).
            3. Extract any prescriptions actually given by the doctor in the audio.
            4. **AI Medical Analysis**: Based on the symptoms and problems reported by the patient in the audio, provide your own expert AI analysis including:
               - Possible Diagnosis
               - Prevention strategies
               - Cure / Treatment options
               - Common Medicines for this condition (general recommendation, separate from what the doctor prescribed)
               - Lifestyle Changes
            ${medicalContext ? '\n5. When relevant, cite insights from the provided medical research to support your analysis.' : ''}
            
            Return the output strictly in JSON format matching the schema.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for factual accuracy
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini.");
    }

    const data = JSON.parse(text);

    // Add vector DB insights to the result only in HYBRID mode
    if (mode === AnalysisMode.HYBRID && vectorDBResults.length > 0) {
      const vectorDBInsights = vectorDBResults.map(result => ({
        title: result.document.metadata.title || result.document.fileName,
        relevance: result.score,
        excerpt: result.document.content.slice(0, 500) // First 500 chars
      }));
      return {
        ...data,
        vectorDBInsights
      } as AIAnalysisResult;
    }

    return data as AIAnalysisResult;
  } catch (error) {
    console.error("Error analyzing consultation:", error);
    throw error;
  }
};

/**
 * Analyze consultation text (instead of audio) using Gemini API
 * Supports Gemini and Hybrid modes
 */
export const analyzeConsultationText = async (
  consultationText: string,
  doctorName: string,
  patientName: string,
  apiKey: string,
  mode: AnalysisMode = AnalysisMode.HYBRID
): Promise<AIAnalysisResult> => {
  console.log(`[GeminiService] Starting text analysis in ${mode} mode`);
  
  try {
    const genAI = new GoogleGenAI({ apiKey });
    
    // Load vector DB only for hybrid mode
    if (mode === AnalysisMode.HYBRID && !vectorDB) {
      console.log('[GeminiService] Loading medical papers vector database for hybrid mode...');
      const dbPath = `${import.meta.env.BASE_URL || '/'}vectordb/vectordb.json`;
      console.log('[GeminiService] Vector DB path:', dbPath);
      try {
        vectorDB = await loadVectorDatabase(dbPath);
        console.log(`[GeminiService] Successfully loaded ${vectorDB.documents.length} medical papers`);
      } catch (dbError) {
        console.error('[GeminiService] Failed to load vector database:', dbError);
        console.warn('[GeminiService] Continuing without vector DB in hybrid mode');
      }
    } else if (mode === AnalysisMode.HYBRID && vectorDB) {
      console.log('[GeminiService] Using cached vector DB with', vectorDB.documents.length, 'papers');
    }

    // For hybrid mode, search vector DB with consultation text
    let medicalContext = '';
    let vectorDBResults: any[] = [];
    if (mode === AnalysisMode.HYBRID && vectorDB) {
      try {
        console.log('[GeminiService] Searching vector DB for relevant medical research...');
        vectorDBResults = await searchVectorDatabase(consultationText, vectorDB, 5);
        console.log(`[GeminiService] Found ${vectorDBResults.length} relevant papers`);
        
        if (vectorDBResults.length > 0) {
          medicalContext = extractRelevantContext(vectorDBResults);
        }
      } catch (searchError) {
        console.warn('[GeminiService] Vector DB search failed, continuing with Gemini only:', searchError);
      }
    }

    // Construct prompt with optional medical context
    const systemPrompt = mode === AnalysisMode.HYBRID && medicalContext
      ? `You are a medical AI assistant. MODE: Hybrid Analysis - Using Gemini AI + Medical Research Database.\n\nAnalyze the consultation notes below.\n\nRELEVANT MEDICAL RESEARCH:\n${medicalContext}\n\nIMPORTANT: Incorporate insights from this research to enhance your analysis, especially for prevention, treatment recommendations, and lifestyle changes.`
      : `You are a medical AI assistant. MODE: Pure Gemini AI Analysis.\n\nAnalyze the consultation notes and provide comprehensive medical insights based on your medical knowledge.`;

    const prompt = `${systemPrompt}\n\nConsultation Notes:\n${consultationText}\n\nProvide:\n1. Professional summary\n2. For transcript field, return the consultation notes exactly as provided (single entry with speaker 'Input' and the full text)\n3. Prescriptions (if any medications mentioned)\n4. Medical insights including diagnosis, prevention, treatment, medicines, and lifestyle changes.`;

    console.log('[GeminiService] Sending request to Gemini API...');
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    console.log('[GeminiService] Received response from Gemini API');
    const result = JSON.parse(response.text);
    
    // Add vector DB insights if in hybrid mode
    if (mode === AnalysisMode.HYBRID && vectorDBResults.length > 0) {
      result.vectorDBInsights = vectorDBResults.map(r => ({
        title: r.document.metadata.title || r.document.fileName,
        relevance: r.score,
        excerpt: r.document.content.slice(0, 500)
      }));
    }

    console.log('[GeminiService] Text analysis complete');
    return result;
  } catch (error) {
    console.error('[GeminiService] Error in text analysis:', error);
    throw error;
  }
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};