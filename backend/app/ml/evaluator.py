import logging
from typing import Dict, Any
import torch
from torch.utils.data import DataLoader
from app.ml.config import MLConfig, ml_config
from app.ml.metrics import calculate_metrics

logger = logging.getLogger(__name__)


class Evaluator:
    """
    Evaluator class for assessing model metrics on test set.
    """
    def __init__(self, model: torch.nn.Module, test_loader: DataLoader, config: MLConfig = ml_config, device: torch.device = None):
        self.model = model
        self.test_loader = test_loader
        self.config = config
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

    def evaluate(self) -> Dict[str, Any]:
        """Runs inference on test_loader and computes evaluation metrics."""
        self.model.eval()
        all_targets = []
        all_preds = []
        all_probs = []

        logger.info(f"Evaluating model on test dataset using device '{self.device}'...")

        with torch.no_grad():
            for images, labels in self.test_loader:
                images = images.to(self.device)
                outputs = self.model(images)
                probs = torch.softmax(outputs, dim=1)
                _, preds = torch.max(outputs, 1)

                all_targets.extend(labels.numpy())
                all_preds.extend(preds.cpu().numpy())
                all_probs.extend(probs.cpu().numpy())

        metrics = calculate_metrics(all_targets, all_preds, all_probs, class_names=self.config.CLASS_NAMES)
        logger.info(f"Evaluation complete. Accuracy: {metrics['accuracy']:.4f}, F1-Score: {metrics['f1_score']:.4f}")
        return metrics
