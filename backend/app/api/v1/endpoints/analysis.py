import io
import json
import logging
from typing import List, Optional
from PIL import Image, UnidentifiedImageError
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.medical_image import MedicalScan
from app.schemas.analysis import AnalysisResponse, MedicalReportSchema
from app.services.model_service import get_model_service, PyTorchModelService
from app.llm.report_generator import get_report_generator, MedicalReportGenerator

from app.models.user import User
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB max limit


@router.post("/analysis", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED, summary="Upload & Analyze Medical Image with Grad-CAM XAI & Gemini LLM Report")
async def analyze_medical_image(
    file: UploadFile = File(...),
    modality: str = Form("X-Ray"),
    patient_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    model_service: PyTorchModelService = Depends(get_model_service),
    report_generator: MedicalReportGenerator = Depends(get_report_generator),
):
    """
    Accepts medical scan image upload, executes PyTorch classification, generates Grad-CAM heatmaps,
    synthesizes an AI medical report via Gemini LLM, and persists the record to the database.
    """
    filename = file.filename or "uploaded_scan.png"
    logger.info(f"Received scan upload request: '{filename}' (modality: {modality}, patient_id: {patient_id})")

    if file.content_type and not (file.content_type.startswith("image/") or file.content_type == "application/octet-stream"):
        logger.warning(f"Rejected scan upload '{filename}': Invalid MIME type '{file.content_type}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file must be a valid image format (PNG, JPEG, DICOM)."
        )

    content = await file.read()
    if not content:
        logger.warning(f"Rejected scan upload '{filename}': File is empty.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file appears to be empty. Please select a valid scan image."
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        logger.warning(f"Rejected scan upload '{filename}': File size exceeds limit ({len(content)} bytes)")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 15MB upload limit. Please compress or select a smaller image."
        )

    # Validate image integrity with PIL
    try:
        img_obj = Image.open(io.BytesIO(content))
        img_obj.verify()
    except Exception as img_err:
        logger.warning(f"Rejected corrupted image '{filename}': {img_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file appears to be corrupted or is not a valid medical image file."
        )

    if modality == "X-Ray":
        # 1. Execute PyTorch Deep Learning inference & Grad-CAM XAI
        try:
            logger.info(f"Running model inference on '{filename}'...")
            prediction = model_service.predict_image(image_bytes=content, modality=modality)
            logger.info(f"Model inference completed for '{filename}': {prediction['prediction_class']} ({prediction['confidence_score']:.1%})")
        except Exception as e:
            logger.error(f"Model inference failed for '{filename}': {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI Diagnostic Engine is temporarily out of service. Please try again shortly."
            )

        # 2. Generate LLM AI Medical Report via Gemini
        try:
            report_dict = report_generator.generate_report(
                prediction_class=prediction["prediction_class"],
                confidence_score=prediction["confidence_score"],
                probabilities=prediction.get("probabilities"),
                gradcam_explanation=prediction.get("ai_explanation"),
                modality=modality,
                patient_id=patient_id
            )
        except Exception as e:
            logger.warning(f"Report generator fallback triggered for '{filename}': {str(e)}")
            report_dict = None
    else:
        # Multimodal Vision Analysis for non-X-ray scans (MRI, CT, etc)
        try:
            logger.info(f"Routing '{filename}' ({modality}) to Gemini Multimodal Vision API...")
            fresh_img = Image.open(io.BytesIO(content))
            vision_result = report_generator.generate_multimodal_report(
                image=fresh_img,
                modality=modality,
                patient_id=patient_id
            )
            prediction = {
                "prediction_class": vision_result.get("prediction_class", "ANALYZED"),
                "confidence_score": vision_result.get("confidence_score", 0.90),
                "findings_summary": vision_result.get("findings_summary", "Multimodal vision analysis completed."),
                "probabilities": None,
                "original_url": None,
                "heatmap_url": None,
                "overlay_url": None,
                "ai_explanation": "Grad-CAM XAI heatmaps are trained specifically for Chest X-Rays and are currently disabled for this modality."
            }
            report_dict = vision_result.get("report")
        except Exception as e:
            logger.error(f"Multimodal Vision inference failed for '{filename}': {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Multimodal AI Engine is temporarily out of service. Please try again shortly."
            )

    # 3. Persist record in database
    db_scan = MedicalScan(
        user_id=current_user.id,
        filename=filename,
        modality=modality,
        patient_id=patient_id,
        prediction_class=prediction["prediction_class"],
        confidence_score=prediction["confidence_score"],
        findings_summary=prediction["findings_summary"],
        original_url=prediction.get("original_url"),
        heatmap_url=prediction.get("heatmap_url"),
        overlay_url=prediction.get("overlay_url"),
        ai_explanation=prediction.get("ai_explanation"),
        medical_report_json=json.dumps(report_dict) if report_dict else None,
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)
    logger.info(f"Saved analysis record #{db_scan.id} for '{filename}' to database.")

    return AnalysisResponse(
        id=db_scan.id,
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
        created_at=db_scan.created_at
    )


@router.get("/analysis", response_model=List[AnalysisResponse], summary="Get List of Analyzed Scans")
def list_scans(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve paginated list of medical scan analyses stored in the database for current user.
    """
    scans = db.query(MedicalScan).filter(MedicalScan.user_id == current_user.id).order_by(MedicalScan.created_at.desc()).offset(skip).limit(limit).all()
    results = []
    for s in scans:
        report_obj = None
        if s.medical_report_json:
            try:
                report_obj = MedicalReportSchema(**json.loads(s.medical_report_json))
            except Exception:
                report_obj = None

        results.append(
            AnalysisResponse(
                id=s.id,
                filename=s.filename,
                modality=s.modality,
                patient_id=s.patient_id,
                prediction_class=s.prediction_class,
                confidence_score=s.confidence_score,
                probabilities=None,
                findings_summary=s.findings_summary,
                original_url=s.original_url,
                heatmap_url=s.heatmap_url,
                overlay_url=s.overlay_url,
                ai_explanation=s.ai_explanation,
                medical_report=report_obj,
                created_at=s.created_at
            )
        )
    return results
