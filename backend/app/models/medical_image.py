import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Text, Float, ForeignKey, Boolean
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

    # Async task processing
    status = Column(String(50), nullable=False, default="completed") # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)

    # Correlated Medical Document
    document_id = Column(Integer, ForeignKey("medical_report_documents.id"), nullable=True)

    # Linked Prior Study for comparison (Task 4)
    prior_scan_id = Column(Integer, ForeignKey("medical_scans.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="scans")
    document = relationship("MedicalReportDocument", back_populates="scans")
    findings = relationship("ScanFinding", back_populates="scan", cascade="all, delete-orphan")
    audit_logs = relationship("AnalysisAuditLog", back_populates="scan", cascade="all, delete-orphan")
    series = relationship("ScanSeries", back_populates="scan", uselist=False, cascade="all, delete-orphan")


class ScanFinding(Base):
    """
    SQLAlchemy model storing structured scan findings (Task 1).
    """
    __tablename__ = "scan_findings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scan_id = Column(Integer, ForeignKey("medical_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(100), nullable=False)
    body_region = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)  # normal, mild, moderate, severe, critical
    confidence = Column(Float, nullable=False)
    location_description = Column(Text, nullable=True)
    icd10_hint = Column(String(50), nullable=True)

    scan = relationship("MedicalScan", back_populates="findings")


class MedicalReportDocument(Base):
    """
    SQLAlchemy model storing processed medical documents (PDF/text) with Gemini-extracted structured intelligence.
    """
    __tablename__ = "medical_report_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    content_text = Column(Text, nullable=True)
    patient_id = Column(String(100), nullable=True)
    extracted_data_json = Column(Text, nullable=True)  # Structured JSON (patient info, flagged labs, findings)
    needs_review = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="documents")
    scans = relationship("MedicalScan", back_populates="document")


class AnalysisAuditLog(Base):
    """
    SQLAlchemy model storing diagnostic run audits for clinician transparency (Task 5).
    """
    __tablename__ = "analysis_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scan_id = Column(Integer, ForeignKey("medical_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt_text = Column(Text, nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    gradcam_parameters_json = Column(Text, nullable=True)
    request_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    scan = relationship("MedicalScan", back_populates="audit_logs")


class ScanSeries(Base):
    """
    SQLAlchemy model storing slice series metadata for CT/PET scans (Task 3).
    """
    __tablename__ = "scan_series"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    scan_id = Column(Integer, ForeignKey("medical_scans.id", ondelete="CASCADE"), nullable=False, index=True)
    total_slices = Column(Integer, nullable=False, default=0)
    modality = Column(String(50), nullable=False)

    scan = relationship("MedicalScan", back_populates="series")
    slices = relationship("ScanSlice", back_populates="series", cascade="all, delete-orphan")


class ScanSlice(Base):
    """
    SQLAlchemy model storing telemetry, prediction, and Grad-CAM for individual slices in a series (Task 3).
    """
    __tablename__ = "scan_slices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    series_id = Column(Integer, ForeignKey("scan_series.id", ondelete="CASCADE"), nullable=False, index=True)
    slice_index = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    prediction_class = Column(String(100), nullable=False)
    confidence_score = Column(Float, nullable=False)
    original_url = Column(String(255), nullable=True)
    heatmap_url = Column(String(255), nullable=True)
    overlay_url = Column(String(255), nullable=True)
    findings_summary = Column(Text, nullable=True)

    series = relationship("ScanSeries", back_populates="slices")




