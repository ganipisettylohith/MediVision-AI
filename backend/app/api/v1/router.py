from fastapi import APIRouter
from app.api.v1.endpoints import health, predict, history, statistics, reports, auth, settings, documents

api_router = APIRouter()

api_router.include_router(auth.router, tags=["Authentication & User Profile"])
api_router.include_router(settings.router, tags=["User Preferences & Settings"])
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(predict.router, tags=["Prediction & Analysis"])
api_router.include_router(documents.router, tags=["Medical Documents"])
api_router.include_router(history.router, tags=["Prediction History"])
api_router.include_router(statistics.router, tags=["Telemetry & Statistics"])
api_router.include_router(reports.router, tags=["PDF Medical Reports"])


