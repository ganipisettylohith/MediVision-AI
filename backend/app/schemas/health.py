from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    status: str = Field(..., example="healthy")
    project_name: str = Field(..., example="MediVision AI")
    version: str = Field(..., example="1.0.0")
    database: str = Field(..., example="connected")
    pytorch_available: bool = Field(..., example=True)
    device: str = Field(..., example="cpu")
