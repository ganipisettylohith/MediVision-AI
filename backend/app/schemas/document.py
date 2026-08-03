from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class StructuredReportSchema(BaseModel):
    patient_name: Optional[str] = Field(None, description="Extracted patient name")
    patient_id: Optional[str] = Field(None, description="Extracted patient ID")
    prior_findings: Optional[str] = Field(None, description="Summary of prior findings or clinical history")
    key_values: Dict[str, str] = Field(default_factory=dict, description="Key metrics or test values extracted")
    flagged_abnormal_labs: List[str] = Field(default_factory=list, description="List of abnormal lab markers flagged")
    clinical_summary: Optional[str] = Field(None, description="Gemini generated executive clinical summary")


class DocumentResponse(BaseModel):
    id: int
    uuid: str
    filename: str
    patient_id: Optional[str] = None
    content_text: Optional[str] = None
    extracted_data: Optional[StructuredReportSchema] = None
    needs_review: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
