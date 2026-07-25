import argparse
import json
import logging
import sys
from pathlib import Path
import torch

# Ensure backend root is in python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.config import MLConfig
from app.ml.dataset import create_dataloaders
from app.ml.evaluator import Evaluator
from app.ml.model import ChestXRayClassifier
from scripts.create_sample_dataset import create_sample_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Evaluate MediVision AI Chest X-ray Classification Model")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to Chest X-ray dataset directory")
    parser.add_argument("--model-path", type=str, default=None, help="Path to saved model weights checkpoint")
    args = parser.parse_args()

    config = MLConfig()
    model_path = Path(args.model_path) if args.model_path else config.get_best_model_path()

    if args.data_dir is None:
        data_path = backend_dir / "data" / "chest_xray"
        if not data_path.exists():
            create_sample_dataset(data_path)
    else:
        data_path = Path(args.data_dir)

    loaders = create_dataloaders(
        data_dir=str(data_path),
        batch_size=config.BATCH_SIZE,
        image_size=config.IMAGE_SIZE
    )

    test_loader = loaders.get("test", loaders.get("val"))
    if not test_loader:
        logger.error("No test or val data loader available for evaluation.")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ChestXRayClassifier(model_name=config.MODEL_NAME, num_classes=config.NUM_CLASSES, pretrained=False)

    if model_path.exists():
        logger.info(f"Loading checkpoint weights from {model_path}...")
        checkpoint = torch.load(model_path, map_location=device)
        model.load_state_dict(checkpoint.get("model_state_dict", checkpoint))
    else:
        logger.warning(f"No checkpoint found at {model_path}. Evaluating using pretrained baseline weights.")
        model = ChestXRayClassifier(model_name=config.MODEL_NAME, num_classes=config.NUM_CLASSES, pretrained=True)

    evaluator = Evaluator(model=model, test_loader=test_loader, config=config, device=device)
    results = evaluator.evaluate()

    print("\n" + "=" * 50)
    print("      EVALUATION METRICS REPORT")
    print("=" * 50)
    print(f"Accuracy         : {results['accuracy']:.4f}")
    print(f"Precision        : {results['precision']:.4f}")
    print(f"Recall           : {results['recall']:.4f}")
    print(f"F1-Score         : {results['f1_score']:.4f}")
    print(f"ROC-AUC          : {results.get('roc_auc', 'N/A')}")
    print(f"Confusion Matrix : {results['confusion_matrix']}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
