from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


from app.schemas.findings import FindingBase

class MedicalReportSchema(BaseModel):
    summary: str
    findings: str
    structured_findings: Optional[List[FindingBase]] = None
    interpretation: str
    recommendations: List[str]
    disclaimer: str
    qualitative_confidence: Optional[str] = None
    confidence_justification: Optional[str] = None


class AnalysisRequest(BaseModel):
    modality: str = Field(default="X-Ray", description="Medical imaging modality e.g. X-Ray, MRI, CT")
    patient_id: Optional[str] = Field(default=None, description="Optional patient identifier")


class ScanSliceResponse(BaseModel):
    slice_index: int
    filename: str
    prediction_class: str
    confidence_score: float
    original_url: Optional[str] = None
    heatmap_url: Optional[str] = None
    overlay_url: Optional[str] = None
    findings_summary: Optional[str] = None

    class Config:
        from_attributes = True


class ScanSeriesResponse(BaseModel):
    total_slices: int
    modality: str
    slices: List[ScanSliceResponse]

    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    id: int
    uuid: Optional[str] = None
    filename: str
    modality: str
    patient_id: Optional[str] = None
    prediction_class: Optional[str] = "PENDING"
    confidence_score: Optional[float] = 0.0
    probabilities: Optional[Dict[str, float]] = None
    findings_summary: Optional[str] = None
    structured_findings: Optional[List[FindingBase]] = None
    
    # XAI Grad-CAM Fields
    original_url: Optional[str] = None
    heatmap_url: Optional[str] = None
    overlay_url: Optional[str] = None
    ai_explanation: Optional[str] = None

    # LLM Gemini Report Field
    medical_report: Optional[MedicalReportSchema] = None

    # Multi-slice series (Task 3)
    series: Optional[ScanSeriesResponse] = None

    # Telemetry
    model_name: Optional[str] = "efficientnet_b0"
    processing_time_ms: Optional[float] = 0.0

    # Async task processing
    status: str = "completed"
    error_message: Optional[str] = None

    created_at: datetime

    class Config:
        from_attributes = True




class StatisticsResponse(BaseModel):
    total_scans: int
    normal_scans: int
    pneumonia_scans: int
    average_confidence: float
    todays_scans: int
    weekly_scans: int


class PaginatedHistoryResponse(BaseModel):
    total: int
    skip: int
    limit: int
    page: int = 1
    page_size: int = 10
    total_pages: int = 1
    scans: List[AnalysisResponse]

