import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class MedicalScan(Base):
    """
    SQLAlchemy model storing medical image analysis telemetry, Grad-CAM assets, and AI LLM reports.
    """
    __tablename__ = "medical_scans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    modality = Column(String(50), nullable=False, default="X-Ray")
    patient_id = Column(String(100), nullable=True)
    prediction_class = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False)
    class_probabilities_json = Column(Text, nullable=True)
    findings_summary = Column(Text, nullable=True)
    
    # XAI Grad-CAM Fields
    original_url = Column(String(255), nullable=True)
    heatmap_url = Column(String(255), nullable=True)
    overlay_url = Column(String(255), nullable=True)
    ai_explanation = Column(Text, nullable=True)

    # LLM Gemini Medical Report (stored as JSON string)
    medical_report_json = Column(Text, nullable=True)

    # Processing & Telemetry
    model_name = Column(String(100), nullable=True, default="efficientnet_b0")
    processing_time_ms = Column(Float, nullable=True, default=0.0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="scans")
