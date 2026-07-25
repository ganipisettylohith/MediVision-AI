import logging
from typing import Optional, Tuple
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

logger = logging.getLogger(__name__)


class GradCAM:
    """
    Gradient-weighted Class Activation Mapping (Grad-CAM) implementation.
    Supports EfficientNet-B0, DenseNet121, and custom PyTorch CNN architectures.
    """
    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        self.model.eval()
        
        self.target_layer = target_layer or self._find_target_layer()
        self.gradients = None
        self.activations = None
        self.hooks = []

        self._register_hooks()

    def _find_target_layer(self) -> nn.Module:
        """
        Automatically identifies the final convolutional layer based on backbone architecture.
        """
        model_type = getattr(self.model, "model_name", "").lower()
        backbone = getattr(self.model, "backbone", self.model)

        if "efficientnet" in model_type:
            if hasattr(backbone, "features") and len(backbone.features) > 0:
                logger.info("Auto-selected EfficientNet final feature layer: backbone.features[-1]")
                return backbone.features[-1]

        elif "densenet" in model_type:
            if hasattr(backbone, "features"):
                if hasattr(backbone.features, "norm5"):
                    logger.info("Auto-selected DenseNet final norm layer: backbone.features.norm5")
                    return backbone.features.norm5
                elif hasattr(backbone.features, "denseblock4"):
                    logger.info("Auto-selected DenseNet final block: backbone.features.denseblock4")
                    return backbone.features.denseblock4

        # Fallback heuristic: find last Conv2d layer in network
        last_conv = None
        for module in backbone.modules():
            if isinstance(module, nn.Conv2d):
                last_conv = module

        if last_conv is not None:
            logger.info(f"Auto-selected fallback final Conv2d layer: {last_conv}")
            return last_conv

        raise ValueError("Could not automatically locate final convolutional layer for Grad-CAM.")

    def _register_hooks(self):
        """Registers forward and backward hooks on target convolutional layer."""
        def save_activation(module, input, output):
            self.activations = output.detach()

        def save_gradient(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()

        self.hooks.append(self.target_layer.register_forward_hook(save_activation))
        self.hooks.append(self.target_layer.register_full_backward_hook(save_gradient))

    def generate_heatmap(self, input_tensor: torch.Tensor, target_category: Optional[int] = None) -> np.ndarray:
        """
        Generates a 2D float heatmap normalized to [0, 1] for input tensor batch size 1.
        """
        self.model.zero_grad()
        output = self.model(input_tensor)

        if target_category is None:
            target_category = int(torch.argmax(output, dim=1).item())

        score = output[0, target_category]
        score.backward(retain_graph=True)

        if self.gradients is None or self.activations is None:
            raise RuntimeError("Grad-CAM hooks failed to capture gradients/activations.")

        # Spatial mean of gradients per feature map channel
        weights = torch.mean(self.gradients, dim=(2, 3), keepdim=True)
        
        # Weighted combination of forward activation maps
        cam = torch.sum(weights * self.activations, dim=1, keepdim=True)
        
        # Apply ReLU to keep only features that positively influence target class
        cam = F.relu(cam)

        # Upsample to match input image size (height, width)
        input_size = (input_tensor.shape[2], input_tensor.shape[3])
        cam = F.interpolate(cam, size=input_size, mode="bilinear", align_corners=False)

        heatmap = cam.squeeze().cpu().numpy()
        
        # Normalize heatmap between 0.0 and 1.0
        min_val, max_val = heatmap.min(), heatmap.max()
        if max_val > min_val:
            heatmap = (heatmap - min_val) / (max_val - min_val)
        else:
            heatmap = np.zeros_like(heatmap)

        return heatmap

    def remove_hooks(self):
        """Clean up registered hooks."""
        for hook in self.hooks:
            hook.remove()
        self.hooks.clear()

    def __del__(self):
        self.remove_hooks()
