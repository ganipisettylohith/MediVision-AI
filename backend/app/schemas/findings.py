from pydantic import BaseModel, Field
from typing import Optional

class FindingBase(BaseModel):
    label: str = Field(..., description="The name of the finding, e.g., Consolidation, Lesion, Fracture")
    body_region: str = Field(..., description="Body region affected, e.g., Lower Left Lung, R-Frontal Lobe")
    severity: str = Field(..., description="Severity classification: normal, mild, moderate, severe, critical")
    confidence: float = Field(..., description="Probability or confidence score (0.0 to 1.0)")
    location_description: str = Field(..., description="Detailed description of spatial location")
    icd10_hint: Optional[str] = Field(None, description="Suggested ICD-10 diagnostic code hint")

class FindingCreate(FindingBase):
    pass

class FindingResponse(FindingBase):
    id: int
    scan_id: int

    class Config:
        from_attributes = True
