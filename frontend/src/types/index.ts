export interface HealthStatus {
  status: string;
  project_name: string;
  version: string;
  database: string;
  pytorch_available: boolean;
  device: string;
}

export interface MedicalReport {
  summary: string;
  findings: string;
  interpretation: string;
  recommendations: string[];
  disclaimer: string;
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
  original_url?: string;
  heatmap_url?: string;
  overlay_url?: string;
  ai_explanation?: string;
  medical_report?: MedicalReport;
  model_name?: string;
  processing_time_ms?: number;
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
  created_at: string;
  total_scans: number;
  last_scan_date?: string;
  settings?: UserSettingsSchema;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: UserResponse;
}
