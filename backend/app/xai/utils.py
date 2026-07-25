from typing import Dict, Tuple
import numpy as np
from PIL import Image
import matplotlib.cm as cm


def heatmap_to_image(heatmap: np.ndarray) -> Image.Image:
    """
    Converts 2D float heatmap [0.0, 1.0] into a Jet-colored RGB PIL Image.
    """
    # Apply matplotlib Jet colormap
    colormap = cm.get_cmap("jet")
    rgba_image = colormap(heatmap)  # returns (H, W, 4) in [0.0, 1.0]
    rgb_image = (rgba_image[:, :, :3] * 255).astype(np.uint8)
    return Image.fromarray(rgb_image)


def generate_overlay(original_img: Image.Image, heatmap: np.ndarray, alpha: float = 0.5) -> Image.Image:
    """
    Blends raw original image with colored Grad-CAM heatmap using alpha weighting.
    """
    # Ensure original image is RGB and matches heatmap resolution
    orig_rgb = original_img.convert("RGB")
    heatmap_img = heatmap_to_image(heatmap).resize(orig_rgb.size, Image.Resampling.BILINEAR)

    orig_np = np.array(orig_rgb).astype(np.float32)
    heatmap_np = np.array(heatmap_img).astype(np.float32)

    # Weighted blend
    blended_np = (1 - alpha) * orig_np + alpha * heatmap_np
    blended_np = np.clip(blended_np, 0, 255).astype(np.uint8)

    return Image.fromarray(blended_np)


def analyze_activation_regions(heatmap: np.ndarray, predicted_class: str) -> str:
    """
    Analyzes spatial density of Grad-CAM activations across 4 quadrants to generate textual explanation.
    """
    h, w = heatmap.shape
    mid_h, mid_w = h // 2, w // 2

    quadrants = {
        "Upper-Right Pulmonary Region": float(np.mean(heatmap[0:mid_h, mid_w:w])),
        "Upper-Left Pulmonary Region": float(np.mean(heatmap[0:mid_h, 0:mid_w])),
        "Lower-Right Pulmonary Region": float(np.mean(heatmap[mid_h:h, mid_w:w])),
        "Lower-Left Pulmonary Region": float(np.mean(heatmap[mid_h:h, 0:mid_w])),
    }

    # Find highest activation region
    primary_region = max(quadrants, key=quadrants.get)
    max_val = quadrants[primary_region]

    if max_val < 0.2:
        return f"Grad-CAM neural evaluation shows diffuse, uniform spatial activation patterns consistent with {predicted_class.lower()} findings."

    quadrant_descriptions = []
    for region, score in sorted(quadrants.items(), key=lambda x: x[1], reverse=True):
        if score > 0.35:
            quadrant_descriptions.append(f"{region} (density {round(score * 100)}%)")

    regions_str = ", ".join(quadrant_descriptions) if quadrant_descriptions else f"{primary_region} ({round(max_val * 100)}% activation)"

    if predicted_class.upper() == "PNEUMONIA":
        return f"Neural activation is strongly localized within the {regions_str}. The model highlighted high-density focal opacities in these thoracic zones as key diagnostic indicators."
    else:
        return f"Neural attention is distributed uniformly across {regions_str} with no focal consolidation or asymmetric opacification detected."
