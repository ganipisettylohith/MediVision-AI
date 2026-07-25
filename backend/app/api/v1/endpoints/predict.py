import time
import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.medical_image import MedicalScan
from app.schemas.analysis import AnalysisResponse, MedicalReportSchema
from app.services.model_service import get_model_service, PyTorchModelService
from app.llm.report_generator import get_report_generator, MedicalReportGenerator

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/predict", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED, summary="Upload & Predict Medical Image (PyTorch + Grad-CAM + Gemini Report)")
@router.post("/analysis", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED, summary="Upload & Analyze Medical Image (Alias)")
async def predict_medical_image(
    file: UploadFile = File(...),
    modality: str = Form("X-Ray"),
    patient_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    model_service: PyTorchModelService = Depends(get_model_service),
    report_generator: MedicalReportGenerator = Depends(get_report_generator),
):
    """
    Accepts medical scan image upload, executes PyTorch deep learning inference, generates Grad-CAM heatmaps, synthesizes an AI medical report via Gemini LLM, logs timing metrics, and persists to DB.
    """
    start_time = time.time()
    logger.info(f"Received prediction request for file '{file.filename}', modality='{modality}', patient_id='{patient_id}'")

    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File provided must be a valid image format (JPEG, PNG, DICOM/TIFF converted)."
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    # 1. Execute PyTorch Deep Learning inference & Grad-CAM XAI
    inference_start = time.time()
    prediction = model_service.predict_image(image_bytes=content, modality=modality)
    inference_duration_ms = (time.time() - inference_start) * 1000
    logger.info(f"PyTorch inference completed in {inference_duration_ms:.2f} ms")

    # 2. Generate LLM AI Medical Report via Gemini
    llm_start = time.time()
    report_dict = report_generator.generate_report(
        prediction_class=prediction["prediction_class"],
        confidence_score=prediction["confidence_score"],
        probabilities=prediction.get("probabilities"),
        gradcam_explanation=prediction.get("ai_explanation"),
        modality=modality,
        patient_id=patient_id
    )
    llm_duration_ms = (time.time() - llm_start) * 1000
    logger.info(f"LLM report generation completed in {llm_duration_ms:.2f} ms")

    total_processing_time_ms = (time.time() - start_time) * 1000

    # 3. Persist record in database
    db_scan = MedicalScan(
        filename=file.filename or "uploaded_scan.png",
        modality=modality,
        patient_id=patient_id,
        prediction_class=prediction["prediction_class"],
        confidence_score=prediction["confidence_score"],
        class_probabilities_json=json.dumps(prediction.get("probabilities")) if prediction.get("probabilities") else None,
        findings_summary=prediction["findings_summary"],
        original_url=prediction.get("original_url"),
        heatmap_url=prediction.get("heatmap_url"),
        overlay_url=prediction.get("overlay_url"),
        ai_explanation=prediction.get("ai_explanation"),
        medical_report_json=json.dumps(report_dict),
        model_name=prediction.get("model_name", "efficientnet_b0"),
        processing_time_ms=round(total_processing_time_ms, 2)
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)

    logger.info(f"Scan prediction successfully recorded with ID={db_scan.id}, UUID={db_scan.uuid}")

    return AnalysisResponse(
        id=db_scan.id,
        uuid=db_scan.uuid,
        filename=db_scan.filename,
        modality=db_scan.modality,
        patient_id=db_scan.patient_id,
        prediction_class=db_scan.prediction_class,
        confidence_score=db_scan.confidence_score,
        probabilities=prediction.get("probabilities"),
        findings_summary=db_scan.findings_summary,
        original_url=db_scan.original_url,
        heatmap_url=db_scan.heatmap_url,
        overlay_url=db_scan.overlay_url,
        ai_explanation=db_scan.ai_explanation,
        medical_report=MedicalReportSchema(**report_dict) if report_dict else None,
        model_name=db_scan.model_name,
        processing_time_ms=db_scan.processing_time_ms,
        created_at=db_scan.created_at
    )
