import os
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, Union
from PIL import Image
import torch

from app.xai.gradcam import GradCAM
from app.xai.utils import heatmap_to_image, generate_overlay, analyze_activation_regions

logger = logging.getLogger(__name__)


class GradCAMExplainer:
    """
    Orchestrates Grad-CAM generation, image rendering, asset storage in outputs/heatmaps/, and URL generation.
    """
    def __init__(self, output_base_dir: Union[str, Path] = None):
        if output_base_dir is None:
            # backend/outputs/heatmaps
            self.output_base_dir = Path(__file__).resolve().parent.parent.parent / "outputs" / "heatmaps"
        else:
            self.output_base_dir = Path(output_base_dir)

        os.makedirs(self.output_base_dir, exist_ok=True)

    def explain(
        self,
        model: torch.nn.Module,
        input_tensor: torch.Tensor,
        original_image: Image.Image,
        predicted_class: str,
        target_category: int = None
    ) -> Dict[str, Any]:
        """
        Executes Grad-CAM, saves original, heatmap, and overlay PNG files, and returns relative static URLs & explanation text.
        """
        scan_id = str(uuid.uuid4())[:12]
        scan_dir = self.output_base_dir / scan_id
        os.makedirs(scan_dir, exist_ok=True)

        try:
            # 1. Instantiate Grad-CAM engine
            grad_cam = GradCAM(model=model)
            heatmap = grad_cam.generate_heatmap(input_tensor=input_tensor, target_category=target_category)

            # 2. Render PIL Image assets
            orig_rgb = original_image.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
            heatmap_img = heatmap_to_image(heatmap).resize((224, 224), Image.Resampling.BILINEAR)
            overlay_img = generate_overlay(orig_rgb, heatmap, alpha=0.45)

            # 3. Save assets to disk
            orig_path = scan_dir / "original.png"
            heatmap_path = scan_dir / "heatmap.png"
            overlay_path = scan_dir / "overlay.png"

            orig_rgb.save(orig_path)
            heatmap_img.save(heatmap_path)
            overlay_img.save(overlay_path)

            # 4. Generate spatial textual explanation
            explanation_text = analyze_activation_regions(heatmap, predicted_class=predicted_class)

            # 5. Clean up hooks
            grad_cam.remove_hooks()

            # Relative URLs for FastAPI static files mount
            return {
                "original_url": f"/static/heatmaps/{scan_id}/original.png",
                "heatmap_url": f"/static/heatmaps/{scan_id}/heatmap.png",
                "overlay_url": f"/static/heatmaps/{scan_id}/overlay.png",
                "ai_explanation": explanation_text,
            }

        except Exception as e:
            logger.error(f"Grad-CAM explanation generation failed: {e}", exc_info=True)
            return {
                "original_url": None,
                "heatmap_url": None,
                "overlay_url": None,
                "ai_explanation": f"Visual explanation generator unvailable: {str(e)}",
            }


_explainer_instance = None


def get_explainer() -> GradCAMExplainer:
    global _explainer_instance
    if _explainer_instance is None:
        _explainer_instance = GradCAMExplainer()
    return _explainer_instance
