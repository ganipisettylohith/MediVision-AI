import argparse
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
from app.ml.model import ChestXRayClassifier
from app.ml.trainer import Trainer
from scripts.create_sample_dataset import create_sample_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Train MediVision AI Chest X-ray Classification Model")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to Chest X-ray dataset directory")
    parser.add_argument("--model-name", type=str, default="efficientnet_b0", choices=["efficientnet_b0", "densenet121"], help="Model architecture")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    args = parser.parse_args()

    # 1. Resolve dataset directory
    if args.data_dir is None:
        data_path = backend_dir / "data" / "chest_xray"
        if not data_path.exists():
            logger.info("No data path specified. Generating sample dataset...")
            create_sample_dataset(data_path)
    else:
        data_path = Path(args.data_dir)

    if not data_path.exists():
        logger.error(f"Dataset path '{data_path}' does not exist.")
        sys.exit(1)

    # 2. Configure ML settings
    config = MLConfig(
        MODEL_NAME=args.model_name,
        NUM_EPOCHS=args.epochs,
        BATCH_SIZE=args.batch_size,
        LEARNING_RATE=args.lr
    )

    # 3. Create DataLoaders
    loaders = create_dataloaders(
        data_dir=str(data_path),
        batch_size=config.BATCH_SIZE,
        image_size=config.IMAGE_SIZE
    )

    if "train" not in loaders or "val" not in loaders:
        logger.error("Dataset must contain both 'train' and 'val' split subdirectories.")
        sys.exit(1)

    # 4. Instantiate Model
    logger.info(f"Initializing {config.MODEL_NAME} model...")
    model = ChestXRayClassifier(model_name=config.MODEL_NAME, num_classes=config.NUM_CLASSES, pretrained=True)

    # 5. Execute Training
    trainer = Trainer(
        model=model,
        train_loader=loaders["train"],
        val_loader=loaders["val"],
        config=config
    )

    best_metrics = trainer.fit(epochs=config.NUM_EPOCHS)

    logger.info("=== Training Finished Successfully ===")
    logger.info(f"Best Validation Accuracy: {best_metrics.get('accuracy', 0):.4f}")
    logger.info(f"Best Validation F1-Score: {best_metrics.get('f1_score', 0):.4f}")
    logger.info(f"Saved Best Model Weights to: {config.get_best_model_path()}")


if __name__ == "__main__":
    main()
