import logging
from typing import Dict, Any
from app.ml.predictor import get_predictor, ChestXRayPredictor

logger = logging.getLogger(__name__)


class PyTorchModelService:
    """
    Bridge service connecting FastAPI routing layer with app.ml modular prediction pipeline.
    """
    def __init__(self):
        self.predictor: ChestXRayPredictor = get_predictor()

    def is_available(self) -> bool:
        return self.predictor.model_loaded

    def get_device_name(self) -> str:
        return str(self.predictor.device)

    def predict_image(self, image_bytes: bytes, modality: str = "X-Ray") -> Dict[str, Any]:
        """
        Executes prediction on raw image bytes via PyTorch predictor.
        """
        return self.predictor.predict(image_bytes=image_bytes, modality=modality)


_model_service_instance = None


def get_model_service() -> PyTorchModelService:
    global _model_service_instance
    if _model_service_instance is None:
        _model_service_instance = PyTorchModelService()
    return _model_service_instance
