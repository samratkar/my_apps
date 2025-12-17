import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIAnalysisResult } from "../types";

const modelName = "gemini-2.5-flash";

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
  apiKey: string
): Promise<AIAnalysisResult> => {
  try {
    const genAI = new GoogleGenAI({ apiKey });

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
            
            1. Generate a concise but comprehensive clinical summary.
            2. Transcribe the conversation accurately. Automatically identify speakers based on context (Doctor vs Patient).
            3. Extract any prescriptions actually given by the doctor in the audio.
            4. **AI Medical Analysis**: Based on the symptoms and problems reported by the patient in the audio, provide your own expert AI analysis including:
               - Possible Diagnosis
               - Prevention strategies
               - Cure / Treatment options
               - Common Medicines for this condition (general recommendation, separate from what the doctor prescribed)
               - Lifestyle Changes
            
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

    return data as AIAnalysisResult;
  } catch (error) {
    console.error("Error analyzing consultation:", error);
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