import json
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.core.database import get_db
from app.models.medical_image import MedicalScan
from app.schemas.analysis import AnalysisResponse, MedicalReportSchema, PaginatedHistoryResponse

from app.models.user import User
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


def scan_to_schema(s: MedicalScan) -> AnalysisResponse:
    probs = None
    if s.class_probabilities_json:
        try:
            probs = json.loads(s.class_probabilities_json)
        except Exception:
            probs = None

    report = None
    if s.medical_report_json:
        try:
            report = MedicalReportSchema(**json.loads(s.medical_report_json))
        except Exception:
            report = None

    return AnalysisResponse(
        id=s.id,
        uuid=s.uuid,
        filename=s.filename,
        modality=s.modality,
        patient_id=s.patient_id,
        prediction_class=s.prediction_class,
        confidence_score=s.confidence_score,
        probabilities=probs,
        findings_summary=s.findings_summary,
        original_url=s.original_url,
        heatmap_url=s.heatmap_url,
        overlay_url=s.overlay_url,
        ai_explanation=s.ai_explanation,
        medical_report=report,
        model_name=s.model_name,
        processing_time_ms=s.processing_time_ms,
        created_at=s.created_at
    )


@router.get("/history", response_model=PaginatedHistoryResponse, summary="Query Scans History with Search, Filter & Pagination")
def get_history(
    query: Optional[str] = Query(None, description="Search term for filename, patient ID, or prediction"),
    prediction: Optional[str] = Query(None, description="Filter by prediction class e.g. NORMAL, PNEUMONIA"),
    start_date: Optional[datetime] = Query(None, description="Filter records created on or after start_date"),
    end_date: Optional[datetime] = Query(None, description="Filter records created on or before end_date"),
    sort: str = Query("newest", regex="^(newest|oldest)$", description="Sort order: newest or oldest"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_query = db.query(MedicalScan).filter(MedicalScan.user_id == current_user.id)

    if query:
        search_pattern = f"%{query}%"
        db_query = db_query.filter(
            or_(
                MedicalScan.filename.ilike(search_pattern),
                MedicalScan.patient_id.ilike(search_pattern),
                MedicalScan.prediction_class.ilike(search_pattern),
            )
        )

    if prediction:
        db_query = db_query.filter(MedicalScan.prediction_class.ilike(f"%{prediction}%"))

    if start_date:
        db_query = db_query.filter(MedicalScan.created_at >= start_date)

    if end_date:
        db_query = db_query.filter(MedicalScan.created_at <= end_date)

    total = db_query.count()

    if sort == "oldest":
        db_query = db_query.order_by(asc(MedicalScan.created_at))
    else:
        db_query = db_query.order_by(desc(MedicalScan.created_at))

    scans = db_query.offset(skip).limit(limit).all()

    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = max(1, (total + limit - 1) // limit) if limit > 0 else 1

    return PaginatedHistoryResponse(
        total=total,
        skip=skip,
        limit=limit,
        page=page,
        page_size=limit,
        total_pages=total_pages,
        scans=[scan_to_schema(s) for s in scans]
    )


@router.get("/history/{identifier}", response_model=AnalysisResponse, summary="Get Single Prediction Record by ID or UUID")
def get_scan_by_id(identifier: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if identifier.isdigit():
        scan = db.query(MedicalScan).filter(MedicalScan.id == int(identifier), MedicalScan.user_id == current_user.id).first()
    else:
        scan = db.query(MedicalScan).filter(MedicalScan.uuid == identifier, MedicalScan.user_id == current_user.id).first()

    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Prediction scan '{identifier}' not found in your account history.")

    return scan_to_schema(scan)


@router.delete("/history/{identifier}", status_code=status.HTTP_200_OK, summary="Delete Prediction Record")
def delete_scan_by_id(identifier: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if identifier.isdigit():
        scan = db.query(MedicalScan).filter(MedicalScan.id == int(identifier), MedicalScan.user_id == current_user.id).first()
    else:
        scan = db.query(MedicalScan).filter(MedicalScan.uuid == identifier, MedicalScan.user_id == current_user.id).first()

    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Prediction scan '{identifier}' not found in your account history.")

    scan_id = scan.id
    db.delete(scan)
    db.commit()
    logger.info(f"Deleted prediction record #{scan_id} ({identifier}) for user #{current_user.id}")

    return {"message": f"Successfully deleted scan history record #{scan_id}."}


@router.delete("/history", status_code=status.HTTP_200_OK, summary="Delete All History Records")
def delete_all_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(MedicalScan).filter(MedicalScan.user_id == current_user.id).delete()
    db.commit()
    logger.info(f"Purged all {count} history records for user #{current_user.id}.")

    return {"message": f"Successfully deleted all {count} scan history records for your account."}

