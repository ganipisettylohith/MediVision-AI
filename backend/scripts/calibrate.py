import argparse
import sys
import logging
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim

# Ensure backend root is in python path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.ml.config import MLConfig
from app.ml.dataset import create_dataloaders
from app.ml.model import ChestXRayClassifier
from scripts.create_sample_dataset import create_sample_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def calculate_ece(logits, labels, n_bins=10):
    """Calculates the Expected Calibration Error (ECE)."""
    softmaxes = torch.softmax(logits, dim=1)
    confidences, predictions = torch.max(softmaxes, dim=1)
    accuracies = predictions.eq(labels)

    ece = torch.zeros(1, device=logits.device)
    bin_boundaries = torch.linspace(0, 1, n_bins + 1)

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        # Find elements in current bin
        in_bin = confidences.gt(bin_lower.item()) & confidences.le(bin_upper.item())
        prop_in_bin = in_bin.float().mean()

        if prop_in_bin.item() > 0:
            accuracy_in_bin = accuracies[in_bin].float().mean()
            avg_confidence_in_bin = confidences[in_bin].mean()
            ece += torch.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin

    return ece.item()


def calibrate_temperature(logits, labels):
    """Finds the optimal temperature using L-BFGS to minimize negative log likelihood."""
    temperature = nn.Parameter(torch.ones(1, device=logits.device) * 1.5)
    nll_criterion = nn.CrossEntropyLoss()

    optimizer = optim.LBFGS([temperature], lr=0.01, max_iter=50)

    def eval_loss():
        optimizer.zero_grad()
        loss = nll_criterion(logits / temperature, labels)
        loss.backward()
        return loss

    optimizer.step(eval_loss)
    return max(temperature.item(), 0.1)


def main():
    parser = argparse.ArgumentParser(description="Calibrate MediVision AI model using temperature scaling.")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to validation split")
    parser.add_argument("--model-path", type=str, default=None, help="Path to saved model checkpoint")
    args = parser.parse_args()

    config = MLConfig()
    model_path = Path(args.model_path) if args.model_path else config.get_best_model_path()

    if args.data_dir is None:
        data_path = backend_dir / "data" / "chest_xray"
        if not data_path.exists():
            create_sample_dataset(data_path)
    else:
        data_path = Path(args.data_dir)

    # 1. Load data
    loaders = create_dataloaders(
        data_dir=str(data_path),
        batch_size=config.BATCH_SIZE,
        image_size=config.IMAGE_SIZE
    )
    val_loader = loaders.get("val", loaders.get("test"))
    if not val_loader:
        logger.error("No validation data loader available for calibration.")
        sys.exit(1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ChestXRayClassifier(model_name=config.MODEL_NAME, num_classes=config.NUM_CLASSES, pretrained=False)

    checkpoint = None
    if model_path.exists():
        logger.info(f"Loading weights from {model_path}...")
        checkpoint = torch.load(model_path, map_location=device)
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            model.load_state_dict(checkpoint["model_state_dict"])
        else:
            model.load_state_dict(checkpoint)
    else:
        logger.warning(f"No checkpoint found at {model_path}. Initializing with baseline pretrained weights.")
        model = ChestXRayClassifier(model_name=config.MODEL_NAME, num_classes=config.NUM_CLASSES, pretrained=True)

    model.to(device)
    model.eval()

    # 2. Collect logits and labels
    logits_list = []
    labels_list = []
    
    logger.info("Collecting model logits on validation set...")
    with torch.no_grad():
        for inputs, targets in val_loader:
            inputs = inputs.to(device)
            logits = model(inputs)
            logits_list.append(logits.cpu())
            labels_list.append(targets)

    all_logits = torch.cat(logits_list)
    all_labels = torch.cat(labels_list)

    # 3. Calculate ECE before calibration
    ece_before = calculate_ece(all_logits, all_labels)
    logger.info(f"ECE before calibration: {ece_before:.4f}")

    # 4. Fit temperature scalar
    opt_temp = calibrate_temperature(all_logits, all_labels)
    logger.info(f"Optimal Calibration Temperature found: {opt_temp:.4f}")

    # 5. Calculate ECE after calibration
    calibrated_logits = all_logits / opt_temp
    ece_after = calculate_ece(calibrated_logits, all_labels)
    logger.info(f"ECE after calibration: {ece_after:.4f}")

    # 6. Save calibrated temperature to checkpoint metadata
    if model_path.exists():
        logger.info(f"Updating checkpoint with calibrated temperature scalar: {model_path}")
        if checkpoint is None:
            checkpoint = torch.load(model_path, map_location=device)
        
        if not isinstance(checkpoint, dict):
            # Convert simple state_dict checkpoint to dictionary format
            checkpoint = {"model_state_dict": checkpoint}
        
        checkpoint["temperature"] = opt_temp
        torch.save(checkpoint, model_path)
        logger.info("Calibration temperature successfully written to checkpoint.")
    else:
        # Create a mock checkpoint file just to store it
        logger.info(f"Writing baseline model + calibrated temperature to new checkpoint: {model_path}")
        new_checkpoint = {
            "model_state_dict": model.state_dict(),
            "temperature": opt_temp,
            "model_name": config.MODEL_NAME,
            "class_names": config.CLASS_NAMES
        }
        model_path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(new_checkpoint, model_path)

    print("\n" + "=" * 50)
    print("      TEMPERATURE CALIBRATION SUMMARY")
    print("=" * 50)
    print(f"Optimal Temperature: {opt_temp:.4f}")
    print(f"Before ECE         : {ece_before:.6f}")
    print(f"After ECE          : {ece_after:.6f}")
    print(f"Delta ECE Improvement: {ece_before - ece_after:.6f}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
