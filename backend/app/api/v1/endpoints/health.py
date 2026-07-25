from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.core.database import get_db
from app.schemas.health import HealthCheckResponse
from app.services.model_service import get_model_service, PyTorchModelService

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse, summary="System Health Status")
def check_health(
    db: Session = Depends(get_db),
    model_service: PyTorchModelService = Depends(get_model_service),
):
    """
    Perform a complete health check verification of Database, PyTorch, and Application components.
    """
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return HealthCheckResponse(
        status="healthy",
        project_name=settings.PROJECT_NAME,
        version="1.0.0",
        database=db_status,
        pytorch_available=model_service.is_available(),
        device=model_service.get_device_name(),
    )
