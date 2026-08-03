import json
from typing import Dict, Any, Optional


class MedicalPromptBuilder:
    """
    Constructs structured prompts for Gemini LLM report generation.
    Enforces strict diagnostic boundaries (the PyTorch model determines the diagnosis; Gemini formats the report).
    """
    
    SYSTEM_INSTRUCTIONS = (
        "You are an expert AI Radiologist Assistant for MediVision AI. "
        "CRITICAL RULE: You MUST NOT alter, invent, or challenge the diagnosis provided. "
        "The primary diagnosis was computed by an automated PyTorch Deep Learning computer vision model. "
        "Your sole task is to synthesize a professional, highly structured AI-assisted medical report based on the provided parameters. "
        "You MUST return ONLY valid JSON matching the exact specified schema. Do not include markdown codeblock backticks."
    )

    @classmethod
    def get_modality_instructions(cls, modality: str) -> str:
        """Returns modality-specific clinical annotation directives for Gemini."""
        modality_upper = modality.upper()
        if "CT" in modality_upper:
            return (
                "- Evaluate anatomical CT window settings (soft tissue, bone, lung windows).\n"
                "- Note any Hounsfield Unit (HU) density variances, focal lesions, or hyperdensities.\n"
                "- Correlate axial/coronal/sagittal slice coordinates if relevant."
            )
        elif "MRI" in modality_upper:
            return (
                "- Evaluate signal intensities across T1-weighted, T2-weighted, and FLAIR sequences.\n"
                "- Comment on contrast enhancement patterns, diffusion-restricted lesions, or structural changes.\n"
                "- Describe tissue interfaces and edema/fluid accumulations."
            )
        elif "PET" in modality_upper:
            return (
                "- Evaluate Standardized Uptake Value (SUV) and FDG (Fluorodeoxyglucose) avidity.\n"
                "- Identify metabolic hotspots, hypermetabolic lesions, or atypical uptake zones.\n"
                "- Compare tracer uptake relative to physiologic background liver/mediastinal blood pool levels."
            )
        elif "ULTRASOUND" in modality_upper:
            return (
                "- Evaluate echogenicity profiles (hypoechoic, hyperechoic, anechoic, or isoechoic).\n"
                "- Note posterior acoustic shadowing, acoustic enhancement, or boundary definition.\n"
                "- Describe cystic vs solid characteristics and vascularity signs."
            )
        elif "MAMMOGRAPHY" in modality_upper:
            return (
                "- Frame analysis within the BI-RADS (Breast Imaging-Reporting and Data System) assessment categories (0-6).\n"
                "- Evaluate breast density, architectural distortion, focal masses, and microcalcification patterns.\n"
                "- Check spiculation, margins, and asymmetry."
            )
        else:
            return (
                "- Evaluate radiographic densities, consolidations, opacities, and lung volumes.\n"
                "- Note costophrenic angles, cardiac silhouette size, and hilar contours."
            )

    @classmethod
    def build_prompt(
        cls,
        prediction_class: str,
        confidence_score: float,
        probabilities: Optional[Dict[str, float]],
        gradcam_explanation: Optional[str],
        modality: str = "X-Ray",
        patient_id: Optional[str] = None,
        comparison_info: Optional[str] = None
    ) -> str:
        
        prob_str = json.dumps(probabilities) if probabilities else "N/A"
        patient_info = patient_id if patient_id else "Anonymous"
        modality_directives = cls.get_modality_instructions(modality)
        
        comparison_directives = ""
        if comparison_info:
            comparison_directives = f"""
PRIOR STUDY COMPARISON DATA:
{comparison_info}
Please compare the current findings against this prior history and include a section/field comparison detailing new, resolved, or stable findings.
"""

        confidence_section = ""
        if modality.upper() != "X-RAY":
            confidence_section = """
  "qualitative_confidence": "<low, moderate, or high>",
  "confidence_justification": "<brief clinical justification for the confidence band chosen>",
"""

        prompt = f"""{cls.SYSTEM_INSTRUCTIONS}
Custom Modality Diagnostic Directives:
{modality_directives}
{comparison_directives}
INPUT DIAGNOSTIC DATA:
- Patient ID: {patient_info}
- Imaging Modality: {modality}
- PyTorch AI Primary Prediction: {prediction_class}
- Primary Model Confidence Score: {round(confidence_score * 100, 2)}%
- Full Class Probability Distribution: {prob_str}
- Grad-CAM Spatial Heatmap Summary: {gradcam_explanation or 'Standard uniform spatial attention patterns.'}

REQUIRED JSON OUTPUT FORMAT:
{{
  "summary": "<1-2 sentence executive overview summarizing the imaging evaluation tailored to {modality}>",
  "findings": "<Detailed clinical findings describing relevant structures, abnormal signals/lesions, or lack thereof under {modality} settings>",
  "structured_findings": [
    {{
      "label": "<Finding label, e.g. Consolidation, Effusion, Mass, Calcification>",
      "body_region": "<Anatomical body region affected, e.g. Left Mid Lung, Right Upper Quadrant>",
      "severity": "<one of: normal, mild, moderate, severe, critical>",
      "confidence": <confidence of finding as float between 0.0 and 1.0>,
      "location_description": "<specific location coordinates/description>",
      "icd10_hint": "<best-effort suggested ICD-10 code tag, or null>"
    }}
  ],
  "interpretation": "<Diagnostic interpretation explaining how findings correlate with the primary prediction and clinical implications>",
  "recommendations": [
      "<First clinical recommendation, e.g. follow-up scanning, clinical correlation, or lab tests>",
      "<Second clinical recommendation>",
      "<Third clinical recommendation>"
  ],{confidence_section}
  "disclaimer": "This report is generated by an artificial intelligence system (MediVision AI) for decision-support purposes only. It does not constitute a definitive medical diagnosis and must be reviewed by a qualified licensed radiologist or physician."
}}

Return ONLY the raw JSON object.
"""
        return prompt

