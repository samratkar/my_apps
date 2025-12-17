export interface TranscriptLine {
  speaker: string;
  text: string;
  timestamp?: string;
}

export interface PrescriptionItem {
  medicine: string;
  dosage: string;
  instructions: string;
}

export interface MedicalInsights {
  possibleDiagnosis: string;
  prevention: string[];
  treatment: string[];
  recommendedMedicines: string[];
  lifestyleChanges: string[];
}

export interface VectorDBInsight {
  title: string;
  relevance: number;
  excerpt: string;
}

export interface AIAnalysisResult {
  summary: string;
  transcript: TranscriptLine[];
  prescriptions: PrescriptionItem[];
  medicalInsights: MedicalInsights;
  vectorDBInsights?: VectorDBInsight[];
}

export interface ConsultationReport extends AIAnalysisResult {
  doctorName: string;
  patientName: string;
  consultationDate: string;
  analysisMode: AnalysisMode;
}

export enum AppState {
  IDLE = 'IDLE',
  DETAILS_INPUT = 'DETAILS_INPUT',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  VIEWING = 'VIEWING',
  ERROR = 'ERROR'
}

export enum AnalysisMode {
  GEMINI = 'gemini',
  OFFLINE = 'offline',
  HYBRID = 'hybrid'
}

export interface AudioRecording {
  blob: Blob;
  url: string;
}