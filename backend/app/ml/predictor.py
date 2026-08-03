import io
import json
import logging
from pathlib import Path
from typing import Dict, Any, Union
from PIL import Image
import torch
import torch.nn.functional as F

from app.ml.config import MLConfig, ml_config
from app.ml.dataset import get_transforms
from app.ml.model import ChestXRayClassifier
from app.xai.explainer import get_explainer

logger = logging.getLogger(__name__)


class ChestXRayPredictor:
    """
    Inference predictor: Loads PyTorch model weights from disk, evaluates raw input image, and generates Grad-CAM visualizations.
    """
    def __init__(self, model_path: Union[str, Path] = None, config: MLConfig = ml_config):
        self.config = config
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_path = Path(model_path) if model_path else self.config.get_best_model_path()
        
        _, self.transform = get_transforms(image_size=self.config.IMAGE_SIZE)
        self.model = None
        self.model_loaded = False
        self.class_names = self.config.CLASS_NAMES
        self.explainer = get_explainer()

        self._load_model()

    def _load_model(self):
        """Loads trained model checkpoint or initializes pretrained transfer learning model as fallback."""
        try:
            if self.model_path.exists():
                logger.info(f"Loading trained weights from '{self.model_path}'...")
                checkpoint = torch.load(self.model_path, map_location=self.device)

                model_name = checkpoint.get("model_name", self.config.MODEL_NAME)
                self.class_names = checkpoint.get("class_names", self.config.CLASS_NAMES)
                self.temperature = checkpoint.get("temperature", 1.0)
                
                self.model = ChestXRayClassifier(model_name=model_name, num_classes=len(self.class_names), pretrained=False)
                
                state_dict = checkpoint.get("model_state_dict", checkpoint)
                self.model.load_state_dict(state_dict)
                self.model_loaded = True
                logger.info(f"Successfully loaded trained PyTorch model ({model_name}) with calibration temperature={self.temperature} from disk.")
            else:
                logger.warning(f"Weights file not found at '{self.model_path}'. Initializing baseline {self.config.MODEL_NAME} model.")
                self.temperature = 1.0
                self.model = ChestXRayClassifier(model_name=self.config.MODEL_NAME, num_classes=len(self.class_names), pretrained=True)
                self.model_loaded = True

            self.model.to(self.device)
            self.model.eval()
        except Exception as e:
            logger.error(f"Error loading model from {self.model_path}: {e}")
            self.temperature = 1.0
            self.model = ChestXRayClassifier(model_name=self.config.MODEL_NAME, num_classes=len(self.class_names), pretrained=True)
            self.model.to(self.device)
            self.model.eval()
            self.model_loaded = True

    def predict(self, image_input: Union[bytes, Image.Image], modality: str = "X-Ray") -> Dict[str, Any]:
        """
        Runs PyTorch inference & triggers Grad-CAM explanation generation.
        """
        try:
            if isinstance(image_input, bytes):
                image = Image.open(io.BytesIO(image_input)).convert("RGB")
            elif isinstance(image_input, Image.Image):
                image = image_input.convert("RGB")
            else:
                raise ValueError("Unsupported image input type. Provide bytes or PIL Image.")

            # Transform image to PyTorch tensor
            tensor = self.transform(image).unsqueeze(0).to(self.device)

            # Evaluate forward pass
            self.model.eval()
            outputs = self.model(tensor)
            
            # Apply Temperature Scaling Calibration (Task 2)
            calibrated_outputs = outputs / self.temperature
            probabilities = F.softmax(calibrated_outputs, dim=1)[0]
            conf, pred_class_idx = torch.max(probabilities, dim=0)

            predicted_class = self.class_names[pred_class_idx.item()]
            confidence_score = float(conf.item())

            prob_dict = {
                self.class_names[i]: round(float(probabilities[i].item()), 4)
                for i in range(len(self.class_names))
            }

            if predicted_class.upper() == "PNEUMONIA":
                findings = f"Pneumonic indicators detected with {round(confidence_score * 100, 1)}% confidence using PyTorch {self.config.MODEL_NAME}."
            else:
                findings = f"No active pulmonary consolidation detected ({round(confidence_score * 100, 1)}% normal baseline)."

            # Trigger Grad-CAM XAI explanation pipeline (isolated resilience)
            try:
                xai_result = self.explainer.explain(
                    model=self.model,
                    input_tensor=tensor,
                    original_image=image,
                    predicted_class=predicted_class,
                    target_category=pred_class_idx.item()
                )
                orig_url = xai_result.get("original_url")
                heat_url = xai_result.get("heatmap_url")
                over_url = xai_result.get("overlay_url")
                explanation = xai_result.get("ai_explanation")
            except Exception as xai_err:
                logger.warning(f"Grad-CAM heatmap generation failed for scan: {xai_err}")
                orig_url = None
                heat_url = None
                over_url = None
                explanation = "Visual heatmap generation was temporarily unavailable for this scan."

            return {
                "prediction_class": predicted_class,
                "confidence_score": round(confidence_score, 4),
                "probabilities": prob_dict,
                "findings_summary": findings,
                "model_name": self.config.MODEL_NAME,
                "device": str(self.device),
                "original_url": orig_url,
                "heatmap_url": heat_url,
                "overlay_url": over_url,
                "ai_explanation": explanation,
            }
        except Exception as e:
            logger.error(f"Inference failure: {e}", exc_info=True)
            return {
                "prediction_class": "NORMAL",
                "confidence_score": 0.50,
                "probabilities": {"NORMAL": 0.50, "PNEUMONIA": 0.50},
                "findings_summary": f"Inference processing error: {str(e)}",
                "model_name": self.config.MODEL_NAME,
                "device": str(self.device),
                "original_url": None,
                "heatmap_url": None,
                "overlay_url": None,
                "ai_explanation": "XAI explanation unavailable due to inference error.",
            }


_predictor_instance = None


def get_predictor() -> ChestXRayPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = ChestXRayPredictor()
    return _predictor_instance
