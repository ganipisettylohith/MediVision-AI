import os
import json
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from app.models.medical_image import MedicalScan

logger = logging.getLogger(__name__)


class PDFReportGenerator:
    """
    ReportLab PDF generator for MediVision AI clinical diagnostic reports.
    """
    def __init__(self, output_dir: Optional[Path] = None):
        if output_dir is None:
            self.output_dir = Path(__file__).resolve().parent.parent.parent / "outputs" / "reports"
        else:
            self.output_dir = Path(output_dir)

        os.makedirs(self.output_dir, exist_ok=True)

    def generate_pdf(self, scan: MedicalScan) -> Path:
        """
        Generates a professional PDF report for the provided MedicalScan database record.
        Returns Path to the generated PDF file.
        """
        scan_uuid = scan.uuid or f"scan_{scan.id}"
        pdf_path = self.output_dir / f"{scan_uuid}.pdf"

        doc = SimpleDocTemplate(
            str(pdf_path),
            pagesize=letter,
            rightMargin=0.5 * inch,
            leftMargin=0.5 * inch,
            topMargin=0.5 * inch,
            bottomMargin=0.5 * inch
        )

        styles = getSampleStyleSheet()

        # Custom Paragraph Styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0f172a"), # slate-900
        )

        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#64748b"), # slate-500
        )

        h2_style = ParagraphStyle(
            "H2Style",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0284c7"), # brand cyan
            spaceBefore=8,
            spaceAfter=4,
        )

        body_style = ParagraphStyle(
            "BodyStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=colors.HexColor("#334155"), # slate-700
        )

        disclaimer_style = ParagraphStyle(
            "DisclaimerStyle",
            parent=styles["Normal"],
            fontName="Helvetica-Oblique",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#b45309"), # amber-700
        )

        story = []

        # 1. Header Banner
        story.append(Paragraph("MediVision AI — Diagnostic Radiography Report", title_style))
        story.append(Paragraph("Automated PyTorch Neural Network & Grad-CAM Visual Telemetry System", subtitle_style))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

        # 2. Metadata Table
        meta_data = [
            [
                Paragraph("<b>Patient ID:</b>", body_style), Paragraph(scan.patient_id or "N/A", body_style),
                Paragraph("<b>Scan ID:</b>", body_style), Paragraph(scan_uuid[:18], body_style),
            ],
            [
                Paragraph("<b>Modality:</b>", body_style), Paragraph(scan.modality or "X-Ray", body_style),
                Paragraph("<b>Timestamp:</b>", body_style), Paragraph(scan.created_at.strftime("%Y-%m-%d %H:%M:%S UTC"), body_style),
            ],
            [
                Paragraph("<b>Model Architecture:</b>", body_style), Paragraph(scan.model_name or "efficientnet_b0", body_style),
                Paragraph("<b>Inference Latency:</b>", body_style), Paragraph(f"{scan.processing_time_ms or 0:.1f} ms", body_style),
            ],
        ]

        meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.2 * inch, 1.3 * inch, 2.2 * inch])
        meta_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))

        # 3. Diagnostic Class Result Box
        pred_class = (scan.prediction_class or "UNKNOWN").upper()
        conf_pct = f"{round((scan.confidence_score or 0) * 100, 1)}%"

        bg_color = colors.HexColor("#fef2f2") if pred_class == "PNEUMONIA" else colors.HexColor("#f0fdf4")
        text_color = colors.HexColor("#dc2626") if pred_class == "PNEUMONIA" else colors.HexColor("#16a34a")

        result_header_style = ParagraphStyle(
            "ResultHeader",
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=text_color,
        )

        result_box_data = [
            [
                Paragraph(f"Primary AI Classification: <b>{pred_class}</b>", result_header_style),
                Paragraph(f"Model Confidence: <b>{conf_pct}</b>", result_header_style),
            ]
        ]
        result_table = Table(result_box_data, colWidths=[4.5 * inch, 2.5 * inch])
        result_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg_color),
            ("BOX", (0, 0), (-1, -1), 1, text_color),
            ("PADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(result_table)
        story.append(Spacer(1, 12))

        # 4. Class Probabilities Table
        if scan.class_probabilities_json:
            try:
                probs_dict = json.loads(scan.class_probabilities_json)
                prob_rows = [[Paragraph("<b>Classification Category</b>", body_style), Paragraph("<b>Probability Score</b>", body_style)]]
                for cat, val in probs_dict.items():
                    prob_rows.append([Paragraph(cat, body_style), Paragraph(f"{round(val * 100, 2)}%", body_style)])
                
                prob_table = Table(prob_rows, colWidths=[4.0 * inch, 3.0 * inch])
                prob_table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("PADDING", (0, 0), (-1, -1), 4),
                ]))
                story.append(Paragraph("Class Probabilities Breakdown", h2_style))
                story.append(prob_table)
                story.append(Spacer(1, 10))
            except Exception as e:
                logger.warning(f"Failed to render probabilities table in PDF: {e}")

        # 5. Embedded Grad-CAM Image Visualization (if available on disk)
        overlay_rel_path = scan.overlay_url
        if overlay_rel_path:
            outputs_root = self.output_dir.parent
            # Remove leading /static if present
            clean_path = overlay_rel_path.lstrip("/").replace("static/", "")
            img_disk_path = outputs_root / clean_path
            
            if img_disk_path.exists():
                try:
                    story.append(Paragraph("Grad-CAM Spatial Attention Map", h2_style))
                    img = RLImage(str(img_disk_path), width=3.2 * inch, height=3.2 * inch)
                    story.append(img)
                    story.append(Spacer(1, 10))
                except Exception as e:
                    logger.warning(f"Could not embed Grad-CAM image in PDF: {e}")

        # 6. Structured LLM Medical Report
        if scan.medical_report_json:
            try:
                report = json.loads(scan.medical_report_json)
                story.append(Paragraph("AI-Assisted Radiographic Report", h2_style))

                if "summary" in report:
                    story.append(Paragraph("<b>1. Executive Summary:</b>", body_style))
                    story.append(Paragraph(report["summary"], body_style))
                    story.append(Spacer(1, 6))

                if "findings" in report:
                    story.append(Paragraph("<b>2. Radiographic Findings:</b>", body_style))
                    story.append(Paragraph(report["findings"], body_style))
                    story.append(Spacer(1, 6))

                if "interpretation" in report:
                    story.append(Paragraph("<b>3. Diagnostic Interpretation:</b>", body_style))
                    story.append(Paragraph(report["interpretation"], body_style))
                    story.append(Spacer(1, 6))

                if "recommendations" in report and isinstance(report["recommendations"], list):
                    story.append(Paragraph("<b>4. Recommended Actions:</b>", body_style))
                    for rec in report["recommendations"]:
                        story.append(Paragraph(f"• {rec}", body_style))
                    story.append(Spacer(1, 6))

            except Exception as e:
                logger.warning(f"Error parsing medical report JSON for PDF: {e}")

        # 7. Regulatory Disclaimer Footer
        story.append(Spacer(1, 10))
        disclaimer_text = (
            "<b>Regulatory Medical Disclaimer:</b> This document was generated by an artificial intelligence decision-support "
            "system (MediVision AI). It is intended solely for diagnostic assistance and is NOT a substitute for formal medical advice, "
            "diagnosis, or treatment. All findings must be validated by a licensed physician or board-certified radiologist."
        )
        disclaimer_box = Table([[Paragraph(disclaimer_text, disclaimer_style)]], colWidths=[7.0 * inch])
        disclaimer_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fffbeb")),
            ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#f59e0b")),
            ("PADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(disclaimer_box)

        # Build document
        doc.build(story)
        logger.info(f"Successfully generated PDF report at '{pdf_path}'")
        return pdf_path


_pdf_generator_instance = None


def get_pdf_generator() -> PDFReportGenerator:
    global _pdf_generator_instance
    if _pdf_generator_instance is None:
        _pdf_generator_instance = PDFReportGenerator()
    return _pdf_generator_instance
