import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import List


@dataclass
class MLConfig:
    """
    Hyperparameters and configuration settings for PyTorch training and inference.
    """
    # Architecture
    MODEL_NAME: str = "efficientnet_b0"  # Options: 'efficientnet_b0', 'densenet121'
    NUM_CLASSES: int = 2
    CLASS_NAMES: List[str] = field(default_factory=lambda: ["NORMAL", "PNEUMONIA"])
    
    # Preprocessing
    IMAGE_SIZE: int = 224
    MEAN: List[float] = field(default_factory=lambda: [0.485, 0.456, 0.406])
    STD: List[float] = field(default_factory=lambda: [0.229, 0.224, 0.225])

    # Hyperparameters
    BATCH_SIZE: int = 32
    NUM_EPOCHS: int = 10
    LEARNING_RATE: float = 1e-4
    WEIGHT_DECAY: float = 1e-4
    NUM_WORKERS: int = 2
    
    # Early Stopping & Checkpoints
    PATIENCE: int = 3
    SAVED_MODELS_DIR: Path = Path(__file__).resolve().parent.parent / "saved_models"
    BEST_MODEL_FILENAME: str = "best_model.pth"
    METADATA_FILENAME: str = "model_metadata.json"

    def get_best_model_path(self) -> Path:
        os.makedirs(self.SAVED_MODELS_DIR, exist_ok=True)
        return self.SAVED_MODELS_DIR / self.BEST_MODEL_FILENAME

    def get_metadata_path(self) -> Path:
        os.makedirs(self.SAVED_MODELS_DIR, exist_ok=True)
        return self.SAVED_MODELS_DIR / self.METADATA_FILENAME


ml_config = MLConfig()
