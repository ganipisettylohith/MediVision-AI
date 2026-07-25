import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.medical_image import MedicalScan
from app.reports.pdf_generator import get_pdf_generator, PDFReportGenerator

from app.models.user import User
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/reports/{identifier}/pdf", summary="Generate & Download Clinical PDF Report")
def download_pdf_report(
    identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    pdf_generator: PDFReportGenerator = Depends(get_pdf_generator)
):
    """
    Generates and downloads a clinical PDF diagnostic report for the specified scan ID or UUID.
    """
    if identifier.isdigit():
        scan = db.query(MedicalScan).filter(MedicalScan.id == int(identifier), MedicalScan.user_id == current_user.id).first()
    else:
        scan = db.query(MedicalScan).filter(MedicalScan.uuid == identifier, MedicalScan.user_id == current_user.id).first()

    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medical scan record '{identifier}' not found in your account history."
        )

    try:
        pdf_path = pdf_generator.generate_pdf(scan)
        if not pdf_path.exists():
            raise HTTPException(status_code=500, detail="Failed to create PDF report file.")

        filename = f"MediVision_Report_{scan.uuid[:12]}.pdf"
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=filename
        )
    except Exception as e:
        logger.error(f"PDF generation failed for scan '{identifier}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF report generation error: {str(e)}"
        )
