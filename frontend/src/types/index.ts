export interface HealthStatus {
  status: string;
  project_name: string;
  version: string;
  database: string;
  pytorch_available: boolean;
  device: string;
}

export interface Finding {
  label: string;
  body_region: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | 'critical';
  confidence: number;
  location_description: string;
  icd10_hint?: string | null;
}

export interface ScanSlice {
  slice_index: number;
  filename: string;
  prediction_class: string;
  confidence_score: number;
  original_url?: string;
  heatmap_url?: string;
  overlay_url?: string;
  findings_summary?: string;
}

export interface ScanSeries {
  total_slices: number;
  modality: string;
  slices: ScanSlice[];
}

export interface MedicalReport {
  summary: string;
  findings: string;
  structured_findings?: Finding[];
  interpretation: string;
  recommendations: string[];
  disclaimer: string;
  qualitative_confidence?: string;
  confidence_justification?: string;
}

export interface AnalysisRecord {
  id: number;
  uuid?: string;
  user_id?: number;
  filename: string;
  modality: string;
  patient_id?: string;
  prediction_class: string;
  confidence_score: number;
  probabilities?: Record<string, number>;
  findings_summary: string;
  structured_findings?: Finding[];
  original_url?: string;
  heatmap_url?: string;
  overlay_url?: string;
  ai_explanation?: string;
  medical_report?: MedicalReport;
  series?: ScanSeries;
  prior_scan_id?: number;
  model_name?: string;
  processing_time_ms?: number;
  status: string;
  error_message?: string;
  created_at: string;
}

export interface UserSettingsSchema {
  theme: string;
  notifications_enabled: boolean;
  default_page_size: number;
}

export interface UserResponse {
  id: number;
  full_name: string;
  email: string;
  role?: string;
  created_at: string;
  total_scans: number;
  last_scan_date?: string | null;
  settings?: UserSettingsSchema;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

