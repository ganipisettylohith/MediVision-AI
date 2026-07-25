import logging
import torch
import torch.nn as nn
import torchvision.models as models
from app.ml.config import ml_config

logger = logging.getLogger(__name__)


class ChestXRayClassifier(nn.Module):
    """
    Transfer learning network supporting EfficientNet-B0 and DenseNet121 architectures.
    """
    def __init__(self, model_name: str = "efficientnet_b0", num_classes: int = 2, pretrained: bool = True):
        super(ChestXRayClassifier, self).__init__()
        self.model_name = model_name.lower()
        self.num_classes = num_classes

        if self.model_name == "efficientnet_b0":
            weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
            self.backbone = models.efficientnet_b0(weights=weights)
            in_features = self.backbone.classifier[1].in_features
            
            # Replace classifier head
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(in_features, num_classes)
            )
            logger.info("Initialized EfficientNet-B0 backbone with custom classification head.")

        elif self.model_name == "densenet121":
            weights = models.DenseNet121_Weights.DEFAULT if pretrained else None
            self.backbone = models.densenet121(weights=weights)
            in_features = self.backbone.classifier.in_features
            
            # Replace classifier head
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=0.3),
                nn.Linear(in_features, num_classes)
            )
            logger.info("Initialized DenseNet121 backbone with custom classification head.")
        else:
            raise ValueError(f"Unsupported model architecture: {model_name}. Use 'efficientnet_b0' or 'densenet121'.")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def freeze_backbone(self):
        """Freezes feature extractor layers for initial transfer learning stage."""
        if self.model_name == "efficientnet_b0":
            for param in self.backbone.features.parameters():
                param.requires_grad = False
        elif self.model_name == "densenet121":
            for param in self.backbone.features.parameters():
                param.requires_grad = False
        logger.info("Backbone feature extractor layers frozen.")

    def unfreeze_backbone(self):
        """Unfreezes feature extractor layers for fine-tuning stage."""
        for param in self.backbone.parameters():
            param.requires_grad = True
        logger.info("Backbone feature extractor layers unfrozen for fine-tuning.")
