import io
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.medical_image import MedicalReportDocument, MedicalScan
from app.models.user import User
from app.core.security import get_current_user
from app.schemas.document import DocumentResponse, StructuredReportSchema
from app.llm.gemini_client import get_gemini_client
from app.core.limiter import limiter


# Text extraction imports
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    from pdf2image import convert_from_bytes
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


def extract_text_from_file(filename: str, content: bytes) -> str:
    """Extracts text from PDF or plain text files with OCR fallback."""
    if filename.lower().endswith(".txt"):
        return content.decode("utf-8", errors="ignore")

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported document format. Only .pdf and .txt are supported."
        )

    text = ""
    # 1. Attempt standard PDF text extraction
    if pdfplumber:
        try:
            logger.info("Extracting PDF text using pdfplumber...")
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {e}")
    else:
        logger.warning("pdfplumber is not installed, skipping direct text extraction.")

    # 2. OCR Fallback for scanned/image-only PDFs
    if not text.strip():
        if OCR_AVAILABLE:
            try:
                logger.info("PDF text extraction returned empty. Attempting OCR fallback with pytesseract...")
                images = convert_from_bytes(content)
                for i, img in enumerate(images):
                    logger.info(f"OCRing page {i+1}...")
                    page_text = pytesseract.image_to_string(img)
                    if page_text:
                        text += page_text + "\n"
            except Exception as e:
                logger.error(f"OCR text extraction failed: {e}")
        else:
            logger.warning("OCR libraries (pdf2image/pytesseract) not available. Scanned PDF cannot be OCR'd.")

    return text


@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED, summary="Ingest & Extract Structured Intelligence from PDF/Text Medical Reports")
@limiter.limit("10/minute")
async def upload_medical_document(
    request: Request,
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):

    """
    Accepts clinical report upload (PDF/Text), performs text/OCR extraction, uses Gemini to extract 
    structured telemetry (abnormal labs, patient profile, findings), and saves it to the database.
    """
    from app.core.config import settings
    if settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MediVision AI is running in read-only Demo Mode. Ingestion is disabled."
        )
    filename = file.filename or "report.pdf"
    logger.info(f"Received document upload request: '{filename}' (patient_id: {patient_id})")

    # Basic file validation
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 10MB limit."
        )

    # Magic-byte check for PDF or Plain Text
    is_pdf = content.startswith(b"%PDF")
    is_txt = not is_pdf  # Assume text if not pdf (will fail extraction validation if not readable)
    
    if not is_pdf and not filename.lower().endswith(".txt"):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Upload must be a valid PDF document or Text file."
         )

    # Extract text content
    extracted_text = extract_text_from_file(filename, content)
    if not extracted_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract any readable text or characters from this document. Please ensure it is not password protected."
        )

    # Call Gemini for structured intelligence extraction
    gemini_client = get_gemini_client()
    extracted_data = {}
    
    if gemini_client.is_configured():
        prompt = f"""
You are an expert medical document intelligence assistant.
Extract clinical information from the following raw medical report text and return a structured JSON response matching the schema.

Raw Medical Report Text:
---
{extracted_text}
---

Required JSON Schema:
{{
  "patient_name": "Full name of the patient",
  "patient_id": "MRN or ID of patient",
  "prior_findings": "Summary of prior radiology, labs or clinical history",
  "key_values": {{
      "metric_name": "value"
  }},
  "flagged_abnormal_labs": [
      "list of any lab values or findings that are out of reference range or marked as abnormal"
  ],
  "clinical_summary": "1-2 sentence clinical summary of this report"
}}

Return ONLY the raw JSON object. Do not wrap in markdown backticks.
"""
        response_text = gemini_client.generate_text(prompt)
        if response_text:
            try:
                # Clean up markdown code block if present
                cleaned = response_text.strip()
                if cleaned.startswith("```"):
                    import re
                    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                extracted_data = json.loads(cleaned)
            except Exception as e:
                logger.error(f"Failed parsing structured JSON from Gemini document report: {e}")
    
    # Fallback structure if Gemini not available or failed
    if not extracted_data:
        extracted_data = {
            "patient_name": "Unknown",
            "patient_id": patient_id or "Unknown",
            "prior_findings": "Raw text ingested. Structured parsing unavailable.",
            "key_values": {},
            "flagged_abnormal_labs": [],
            "clinical_summary": "Document ingested via fallback text extraction pipeline."
        }

    # Quality check on extracted text (Task 7)
    needs_review = False
    clean_text = "".join(ch for ch in extracted_text if ch.isalnum())
    if len(extracted_text.strip()) < 50:
        needs_review = True
    elif len(clean_text) / max(len(extracted_text), 1) < 0.4:
        needs_review = True

    # Persist in Database
    db_doc = MedicalReportDocument(
        user_id=current_user.id,
        filename=filename,
        content_text=extracted_text,
        patient_id=extracted_data.get("patient_id") or patient_id,
        extracted_data_json=json.dumps(extracted_data),
        needs_review=needs_review
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    logger.info(f"Saved document ID={db_doc.id}, UUID={db_doc.uuid}, needs_review={db_doc.needs_review}")

    return DocumentResponse(
        id=db_doc.id,
        uuid=db_doc.uuid,
        filename=db_doc.filename,
        patient_id=db_doc.patient_id,
        content_text=db_doc.content_text,
        extracted_data=StructuredReportSchema(**extracted_data),
        needs_review=db_doc.needs_review,
        created_at=db_doc.created_at
    )


@router.get("/documents", response_model=List[DocumentResponse], summary="Retrieve List of Ingested Documents")
def list_documents(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    docs = db.query(MedicalReportDocument).filter(MedicalReportDocument.user_id == current_user.id).order_by(MedicalReportDocument.created_at.desc()).offset(skip).limit(limit).all()
    results = []
    for d in docs:
        try:
            ext_data = json.loads(d.extracted_data_json) if d.extracted_data_json else {}
        except Exception:
            ext_data = {}
        results.append(
            DocumentResponse(
                id=d.id,
                uuid=d.uuid,
                filename=d.filename,
                patient_id=d.patient_id,
                content_text=d.content_text,
                extracted_data=StructuredReportSchema(**ext_data) if ext_data else None,
                needs_review=d.needs_review,
                created_at=d.created_at
            )
        )
    return results


@router.post("/analysis/{scan_id}/correlate/{document_id}", summary="Correlate a Scan with a Prior Medical Report Document")
def correlate_scan_with_document(
    scan_id: int,
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scan = db.query(MedicalScan).filter(MedicalScan.id == scan_id, MedicalScan.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Medical scan not found.")
    
    doc = db.query(MedicalReportDocument).filter(MedicalReportDocument.id == document_id, MedicalReportDocument.user_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Medical document report not found.")
    
    scan.document_id = doc.id
    db.commit()
    return {"message": f"Successfully correlated scan {scan_id} with report document {document_id}"}
