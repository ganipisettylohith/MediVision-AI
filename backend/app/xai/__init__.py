"""
MediVision AI Explainable AI (XAI) Module - Grad-CAM Implementation
"""
from app.xai.gradcam import GradCAM
from app.xai.utils import generate_overlay, analyze_activation_regions
from app.xai.explainer import GradCAMExplainer, get_explainer

__all__ = [
    "GradCAM",
    "generate_overlay",
    "analyze_activation_regions",
    "GradCAMExplainer",
    "get_explainer",
]
