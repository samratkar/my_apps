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

export interface AIAnalysisResult {
  summary: string;
  transcript: TranscriptLine[];
  prescriptions: PrescriptionItem[];
  medicalInsights: MedicalInsights;
}

export interface ConsultationReport extends AIAnalysisResult {
  doctorName: string;
  patientName: string;
  consultationDate: string;
}

export enum AppState {
  IDLE = 'IDLE',
  DETAILS_INPUT = 'DETAILS_INPUT',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  VIEWING = 'VIEWING',
  ERROR = 'ERROR'
}

export interface AudioRecording {
  blob: Blob;
  url: string;
}