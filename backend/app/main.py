import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import Base, engine
from app.core.logging_config import setup_logging

# Setup centralized logging
logger = setup_logging()

outputs_dir = Path(__file__).resolve().parent.parent / "outputs"
os.makedirs(outputs_dir, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on application startup
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialization complete.")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="MediVision AI Backend API — Chest X-Ray AI Diagnostics, Grad-CAM Heatmaps & LLM Medical Reports",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)


from sqlalchemy.exc import SQLAlchemyError, OperationalError

@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Catches database connection failures, cold-start pauses, or SQL errors gracefully.
    """
    logger.error(f"Database exception during {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database service is temporarily unavailable or resuming from standby. Please try again shortly.",
            "error_type": type(exc).__name__,
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catches unhandled server exceptions and returns clean, structured error details without leaking Python tracebacks.
    """
    logger.error(f"Unhandled exception during {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred while processing your request. Please check the uploaded file and try again.",
            "error_type": type(exc).__name__,
        },
    )


# CORS middleware configuration
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount static outputs directory for Grad-CAM visualizations
app.mount("/static", StaticFiles(directory=str(outputs_dir)), name="static")

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root_redirect():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} Backend API",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
