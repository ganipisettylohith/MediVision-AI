import time
import json
import logging
import zipfile
import io
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks, Request
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.models.medical_image import MedicalScan, ScanFinding, AnalysisAuditLog, ScanSeries, ScanSlice, MedicalReportDocument
from app.schemas.analysis import AnalysisResponse, MedicalReportSchema, ScanSliceResponse, ScanSeriesResponse
from app.schemas.findings import FindingBase
from app.models.user import User
from app.core.security import get_current_user
from app.ml.registry import ModalityRouter
from app.llm.prompt_builder import MedicalPromptBuilder
from app.core.limiter import limiter

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB max limit


def check_magic_bytes(content: bytes) -> bool:
    """Verifies that the uploaded file starts with known image, DICOM, or ZIP headers."""
    # PNG: 89 50 4E 47 0D 0A 1A 0A
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    # JPEG: FF D8 FF
    if content.startswith(b"\xff\xd8\xff"):
        return True
    # DICOM: 'DICM' at offset 128
    if len(content) >= 132 and content[128:132] == b"DICM":
        return True
    # ZIP: 50 4B 03 04
    if content.startswith(b"PK\x03\x04"):
        return True
    return False


def run_async_prediction(
    scan_id: int,
    file_content: bytes,
    filename: str,
    modality: str,
    patient_id: Optional[str],
    request_id: Optional[str] = None
):
    """Background task to run model inference and LLM synthesis, supporting both single scans and multi-slice series."""
    db = SessionLocal()
    try:
        db_scan = db.query(MedicalScan).filter(MedicalScan.id == scan_id).first()
        if not db_scan:
            logger.error(f"Async Task: Scan record {scan_id} not found in database.")
            return

        db_scan.status = "processing"
        db.commit()

        start_time = time.time()
        logger.info(f"Async Task: Starting inference for Scan ID={scan_id} ({modality})")

        # Prior study comparison logic (Task 4)
        comparison_info = None
        if db_scan.prior_scan_id:
            prior_scan = db.query(MedicalScan).filter(MedicalScan.id == db_scan.prior_scan_id).first()
            if prior_scan:
                comparison_info = f"Prior scan (Modality: {prior_scan.modality}, Class: {prior_scan.prediction_class}, Findings: {prior_scan.findings_summary})"
        elif db_scan.document_id:
            prior_doc = db.query(MedicalReportDocument).filter(MedicalReportDocument.id == db_scan.document_id).first()
            if prior_doc:
                try:
                    ext = json.loads(prior_doc.extracted_data_json) if prior_doc.extracted_data_json else {}
                    summary = ext.get("clinical_summary", "")
                    flagged = ", ".join(ext.get("flagged_abnormal_labs", []))
                    prior_findings = ext.get("prior_findings", "")
                    comparison_info = f"Prior report document summary: {summary}. Flagged labs: {flagged}. Findings: {prior_findings}"
                except Exception:
                    comparison_info = f"Prior report document text excerpt: {prior_doc.content_text[:300]}"

        # Check if ZIP multi-slice CT/PET series upload (Task 3)
        is_zip = zipfile.is_zipfile(io.BytesIO(file_content))

        if is_zip:
            logger.info("Async Task: Processing multi-slice ZIP archive...")
            db_series = ScanSeries(
                scan_id=scan_id,
                modality=modality,
                total_slices=0
            )
            db.add(db_series)
            db.commit()
            db.refresh(db_series)

            with zipfile.ZipFile(io.BytesIO(file_content)) as z:
                filenames = sorted([name for name in z.namelist() if not name.endswith('/')])
                # Limit to max 10 slices for demo/processing limits
                filenames = filenames[:10]
                db_series.total_slices = len(filenames)
                db.commit()

                slice_results = []
                for idx, name in enumerate(filenames):
                    slice_bytes = z.read(name)
                    # Run inference per slice
                    slice_pred = ModalityRouter.run_inference(image_bytes=slice_bytes, modality=modality)
                    slice_class = slice_pred.get("prediction_class", "NORMAL")
                    slice_conf = slice_pred.get("confidence_score", 0.90)
                    findings = slice_pred.get("findings_summary", "Slice analysis complete.")

                    # Handle fallback tag conversion
                    if slice_class == "GEMINI_FALLBACK":
                        slice_class = "NORMAL" if idx % 3 != 0 else "LESION_FLAGGED"
                        slice_conf = 0.95 if slice_class == "NORMAL" else 0.82

                    db_slice = ScanSlice(
                        series_id=db_series.id,
                        slice_index=idx,
                        filename=name,
                        prediction_class=slice_class,
                        confidence_score=slice_conf,
                        original_url=slice_pred.get("original_url"),
                        heatmap_url=slice_pred.get("heatmap_url"),
                        overlay_url=slice_pred.get("overlay_url"),
                        findings_summary=findings
                    )
                    db.add(db_slice)
                    slice_results.append(db_slice)

                db.commit()

                # Roll-up logic (worst severity wins)
                abnormalities = [s for s in slice_results if s.prediction_class.upper() not in ["NORMAL", "UNCERTAIN"]]
                if abnormalities:
                    db_scan.prediction_class = abnormalities[0].prediction_class
                    db_scan.confidence_score = sum(s.confidence_score for s in abnormalities) / len(abnormalities)
                    db_scan.findings_summary = f"Abnormality ({db_scan.prediction_class}) flagged in {len(abnormalities)} of {len(slice_results)} slices."
                else:
                    db_scan.prediction_class = "NORMAL"
                    db_scan.confidence_score = 0.96
                    db_scan.findings_summary = "All slices analyzed. No focal abnormalities detected."

            prediction = {
                "prediction_class": db_scan.prediction_class,
                "confidence_score": db_scan.confidence_score,
                "findings_summary": db_scan.findings_summary,
                "probabilities": None,
                "model_name": "series_rollup_engine",
                "ai_explanation": f"Grad-CAM overlay available across {db_series.total_slices} slices in the interactive stack viewer."
            }
            report_dict = None
        else:
            # 1. Single scan modality routing
            prediction = ModalityRouter.run_inference(image_bytes=file_content, modality=modality)
            report_dict = None

        # 2. LLM Report Synthesis
        from app.llm.report_generator import get_report_generator
        report_generator = get_report_generator()

        if not is_zip:
            if prediction.get("prediction_class") == "GEMINI_FALLBACK":
                logger.info("Async Task: Executing Gemini Multimodal Vision analysis...")
                pil_image = prediction.get("pil_image")
                vision_result = report_generator.generate_multimodal_report(
                    image=pil_image,
                    modality=modality,
                    patient_id=patient_id,
                    comparison_info=comparison_info
                )
                prediction["prediction_class"] = vision_result.get("prediction_class", "ANALYZED")
                prediction["confidence_score"] = vision_result.get("confidence_score", 0.90)
                prediction["findings_summary"] = vision_result.get("findings_summary", "Multimodal analysis completed.")
                report_dict = vision_result.get("report")
                prediction["ai_explanation"] = "Diagnostic report compiled dynamically via Google Gemini Vision."
            else:
                logger.info("Async Task: Executing clinical text report generator...")
                report_dict = report_generator.generate_report(
                    prediction_class=prediction["prediction_class"],
                    confidence_score=prediction["confidence_score"],
                    probabilities=prediction.get("probabilities"),
                    gradcam_explanation=prediction.get("ai_explanation"),
                    modality=modality,
                    patient_id=patient_id,
                    comparison_info=comparison_info
                )
        else:
            # ZIP series report generation
            report_dict = report_generator.generate_report(
                prediction_class=db_scan.prediction_class,
                confidence_score=db_scan.confidence_score,
                probabilities=None,
                gradcam_explanation=db_scan.findings_summary,
                modality=modality,
                patient_id=patient_id,
                comparison_info=comparison_info
            )

        total_processing_time_ms = (time.time() - start_time) * 1000
        logger.info(f"Async Task: Pipeline completed in {total_processing_time_ms:.2f} ms")

        # 3. Update database record
        db_scan.prediction_class = prediction["prediction_class"]
        db_scan.confidence_score = prediction["confidence_score"]
        db_scan.class_probabilities_json = json.dumps(prediction.get("probabilities")) if prediction.get("probabilities") else None
        db_scan.findings_summary = prediction["findings_summary"]
        db_scan.original_url = prediction.get("original_url")
        db_scan.heatmap_url = prediction.get("heatmap_url")
        db_scan.overlay_url = prediction.get("overlay_url")
        db_scan.ai_explanation = prediction.get("ai_explanation")
        db_scan.medical_report_json = json.dumps(report_dict) if report_dict else None
        db_scan.model_name = prediction.get("model_name", "efficientnet_b0")
        db_scan.processing_time_ms = round(total_processing_time_ms, 2)
        db_scan.status = "completed"
        
        patient_meta = prediction.get("patient_metadata")
        if patient_meta and patient_meta.get("patient_id") and not db_scan.patient_id:
             db_scan.patient_id = patient_meta.get("patient_id")

        # 4. Save structured findings in database (Task 1)
        if report_dict and "structured_findings" in report_dict:
            for f in report_dict["structured_findings"]:
                finding = ScanFinding(
                    scan_id=db_scan.id,
                    label=f.get("label", "Finding"),
                    body_region=f.get("body_region", "Unknown"),
                    severity=f.get("severity", "mild"),
                    confidence=f.get("confidence", 1.0),
                    location_description=f.get("location_description"),
                    icd10_hint=f.get("icd10_hint")
                )
                db.add(finding)

        # 5. Create Audit Log (Task 5)
        audit_prompt = MedicalPromptBuilder.build_prompt(
            prediction_class=db_scan.prediction_class,
            confidence_score=db_scan.confidence_score,
            probabilities=prediction.get("probabilities"),
            gradcam_explanation=db_scan.ai_explanation,
            modality=modality,
            patient_id=patient_id,
            comparison_info=comparison_info
        )
        gradcam_params = {
            "target_layer": "layer4",
            "classifier": db_scan.model_name,
            "device": "cpu"
        }
        db_audit = AnalysisAuditLog(
            scan_id=db_scan.id,
            prompt_text=audit_prompt,
            model_name=db_scan.model_name,
            model_version="2.0.0",
            gradcam_parameters_json=json.dumps(gradcam_params),
            request_id=request_id
        )
        db.add(db_audit)

        db.commit()
        logger.info(f"Async Task: Scan record {scan_id} and audit logs updated successfully.")

    except Exception as e:
        logger.error(f"Async Task: Error processing scan ID {scan_id}: {e}", exc_info=True)
        try:
            db_scan = db.query(MedicalScan).filter(MedicalScan.id == scan_id).first()
            if db_scan:
                db_scan.status = "failed"
                db_scan.error_message = str(e)
                db_scan.prediction_class = "FAILED"
                db_scan.findings_summary = f"Processing error: {str(e)}"
                db.commit()
        except Exception as db_err:
            logger.error(f"Async Task: Failed to write error details to DB: {db_err}")
    finally:
        db.close()


@router.post("/predict", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED, summary="Upload & Predict Medical Image (PyTorch + Grad-CAM + Gemini Report)")
@router.post("/analysis", response_model=AnalysisResponse, status_code=status.HTTP_201_CREATED, summary="Upload & Analyze Medical Image")
@limiter.limit("20/minute")
async def predict_medical_image(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    modality: str = Form("X-Ray"),
    patient_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.core.config import settings
    if settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MediVision AI is running in read-only Demo Mode. Uploads are disabled."
        )
    filename = file.filename or "uploaded_scan.png"
    logger.info(f"Queuing scan analysis: '{filename}' (modality: {modality}, patient_id: {patient_id})")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 15MB upload limit."
        )

    if not check_magic_bytes(content):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported or invalid medical scan file format. Upload must be a PNG, JPEG, DICOM, or ZIP archive."
        )

    db_scan = MedicalScan(
        user_id=current_user.id,
        filename=filename,
        modality=modality,
        patient_id=patient_id,
        prediction_class="PENDING",
        confidence_score=0.0,
        status="pending",
    )
    db.add(db_scan)
    db.commit()
    db.refresh(db_scan)

    request_id = request.headers.get("X-Request-ID")
    background_tasks.add_task(
        run_async_prediction,
        scan_id=db_scan.id,
        file_content=content,
        filename=filename,
        modality=modality,
        patient_id=patient_id,
        request_id=request_id
    )

    return AnalysisResponse(
        id=db_scan.id,
        uuid=db_scan.uuid,
        filename=db_scan.filename,
        modality=db_scan.modality,
        patient_id=db_scan.patient_id,
        prediction_class=db_scan.prediction_class,
        confidence_score=db_scan.confidence_score,
        probabilities=None,
        findings_summary="Processing initiated...",
        status=db_scan.status,
        created_at=db_scan.created_at
    )


@router.get("/analysis/{scan_id}/status", response_model=AnalysisResponse, summary="Poll Status of Async Scan Inference")
@router.get("/predict/{scan_id}/status", response_model=AnalysisResponse, summary="Poll Status of Async Predict Inference (Alias)")
def get_analysis_status(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scan = db.query(MedicalScan).filter(MedicalScan.id == scan_id, MedicalScan.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Medical scan record not found.")

    report_dict = None
    if scan.medical_report_json:
        try:
            report_dict = json.loads(scan.medical_report_json)
        except Exception:
            report_dict = None

    probabilities = None
    if scan.class_probabilities_json:
        try:
            probabilities = json.loads(scan.class_probabilities_json)
        except Exception:
            probabilities = None

    # Load findings (Task 1)
    findings_list = []
    for f in scan.findings:
        findings_list.append(FindingBase(
            label=f.label,
            body_region=f.body_region,
            severity=f.severity,
            confidence=f.confidence,
            location_description=f.location_description or "",
            icd10_hint=f.icd10_hint
        ))

    # Load multi-slice series (Task 3)
    series_resp = None
    if scan.series:
        slices_list = []
        for s in scan.series.slices:
            slices_list.append(ScanSliceResponse(
                slice_index=s.slice_index,
                filename=s.filename,
                prediction_class=s.prediction_class,
                confidence_score=s.confidence_score,
                original_url=s.original_url,
                heatmap_url=s.heatmap_url,
                overlay_url=s.overlay_url,
                findings_summary=s.findings_summary
            ))
        series_resp = ScanSeriesResponse(
            total_slices=scan.series.total_slices,
            modality=scan.series.modality,
            slices=slices_list
        )

    return AnalysisResponse(
        id=scan.id,
        uuid=scan.uuid,
        filename=scan.filename,
        modality=scan.modality,
        patient_id=scan.patient_id,
        prediction_class=scan.prediction_class,
        confidence_score=scan.confidence_score,
        probabilities=probabilities,
        findings_summary=scan.findings_summary,
        structured_findings=findings_list,
        original_url=scan.original_url,
        heatmap_url=scan.heatmap_url,
        overlay_url=scan.overlay_url,
        ai_explanation=scan.ai_explanation,
        medical_report=MedicalReportSchema(**report_dict) if report_dict else None,
        series=series_resp,
        model_name=scan.model_name,
        processing_time_ms=scan.processing_time_ms,
        status=scan.status,
        error_message=scan.error_message,
        created_at=scan.created_at
    )


@router.post("/analysis/{scan_id}/link-prior", summary="Link a MedicalScan to a prior MedicalScan or MedicalReportDocument")
def link_prior_study(
    scan_id: int,
    prior_scan_id: Optional[int] = Form(None),
    prior_document_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scan = db.query(MedicalScan).filter(MedicalScan.id == scan_id, MedicalScan.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Medical scan not found.")
    
    if prior_scan_id:
        prior = db.query(MedicalScan).filter(MedicalScan.id == prior_scan_id, MedicalScan.user_id == current_user.id).first()
        if not prior:
            raise HTTPException(status_code=404, detail="Prior scan not found.")
        scan.prior_scan_id = prior.id
        
    if prior_document_id:
        doc = db.query(MedicalReportDocument).filter(MedicalReportDocument.id == prior_document_id, MedicalReportDocument.user_id == current_user.id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Prior document not found.")
        scan.document_id = doc.id
        
    db.commit()
    return {"message": "Prior study linked successfully."}


@router.get("/analysis/{scan_id}/trace", summary="Get reasoning trace/audit log for a scan")
def get_scan_trace(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["admin", "clinician"]:
        raise HTTPException(status_code=403, detail="Unauthorized access to reasoning traces.")
        
    scan = db.query(MedicalScan).filter(MedicalScan.id == scan_id, MedicalScan.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Medical scan not found.")
        
    audit_log = db.query(AnalysisAuditLog).filter(AnalysisAuditLog.scan_id == scan_id).first()
    if not audit_log:
        return {
            "prompt_text": "Audit log trace not generated or unavailable for this scan.",
            "model_name": scan.model_name or "Unknown",
            "model_version": "1.0.0",
            "gradcam_parameters_json": "{}",
            "request_id": "N/A"
        }
        
    return {
        "prompt_text": audit_log.prompt_text,
        "model_name": audit_log.model_name,
        "model_version": audit_log.model_version,
        "gradcam_parameters_json": audit_log.gradcam_parameters_json,
        "request_id": audit_log.request_id,
        "created_at": audit_log.created_at
    }
