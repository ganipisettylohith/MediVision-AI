import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.medical_image import MedicalScan
from app.schemas.analysis import StatisticsResponse

from app.models.user import User
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/statistics", response_model=StatisticsResponse, summary="Get Dashboard Telemetry & Clinical Statistics")
def get_statistics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Computes dashboard telemetry metrics including total scans, disease breakdown, average confidence, today's scans, and weekly count for current user.
    """
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    seven_days_ago = now - timedelta(days=7)

    user_scans = db.query(MedicalScan).filter(MedicalScan.user_id == current_user.id)

    total_scans = user_scans.count()
    normal_scans = db.query(func.count(MedicalScan.id)).filter(MedicalScan.user_id == current_user.id, MedicalScan.prediction_class.ilike("%NORMAL%")).scalar() or 0
    pneumonia_scans = db.query(func.count(MedicalScan.id)).filter(MedicalScan.user_id == current_user.id, MedicalScan.prediction_class.ilike("%PNEUMONIA%")).scalar() or 0
    
    avg_conf_raw = db.query(func.avg(MedicalScan.confidence_score)).filter(MedicalScan.user_id == current_user.id).scalar()
    average_confidence = round(float(avg_conf_raw), 4) if avg_conf_raw is not None else 0.0

    todays_scans = db.query(func.count(MedicalScan.id)).filter(MedicalScan.user_id == current_user.id, MedicalScan.created_at >= today_start).scalar() or 0
    weekly_scans = db.query(func.count(MedicalScan.id)).filter(MedicalScan.user_id == current_user.id, MedicalScan.created_at >= seven_days_ago).scalar() or 0

    return StatisticsResponse(
        total_scans=total_scans,
        normal_scans=normal_scans,
        pneumonia_scans=pneumonia_scans,
        average_confidence=average_confidence,
        todays_scans=todays_scans,
        weekly_scans=weekly_scans
    )

