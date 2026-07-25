import json
import logging
import time
from pathlib import Path
from typing import Dict, Any, Tuple
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

from app.ml.config import MLConfig, ml_config
from app.ml.metrics import calculate_metrics

logger = logging.getLogger(__name__)


class Trainer:
    """
    Encapsulates PyTorch model training, validation loop, early stopping, and checkpoint management.
    """
    def __init__(
        self,
        model: nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        config: MLConfig = ml_config,
        device: torch.device = None
    ):
        self.model = model
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.config = config
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        self.model.to(self.device)
        self.criterion = nn.CrossEntropyLoss()
        self.optimizer = optim.AdamW(
            self.model.parameters(),
            lr=self.config.LEARNING_RATE,
            weight_decay=self.config.WEIGHT_DECAY
        )
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode="min", factor=0.5, patience=2, verbose=True
        )

        self.best_val_loss = float("inf")
        self.best_metrics = {}

    def train_epoch(self) -> Tuple[float, float]:
        """Runs a single training epoch."""
        self.model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for images, labels in self.train_loader:
            images = images.to(self.device)
            labels = labels.to(self.device)

            self.optimizer.zero_grad()
            outputs = self.model(images)
            loss = self.criterion(outputs, labels)
            loss.backward()
            self.optimizer.step()

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

        epoch_loss = running_loss / total
        epoch_acc = correct / total
        return epoch_loss, epoch_acc

    def validate(self) -> Tuple[float, float, Dict[str, Any]]:
        """Runs validation step and calculates metrics."""
        self.model.eval()
        running_loss = 0.0
        all_targets = []
        all_preds = []
        all_probs = []

        with torch.no_grad():
            for images, labels in self.val_loader:
                images = images.to(self.device)
                labels = labels.to(self.device)

                outputs = self.model(images)
                loss = self.criterion(outputs, labels)
                running_loss += loss.item() * images.size(0)

                probs = torch.softmax(outputs, dim=1)
                _, preds = torch.max(outputs, 1)

                all_targets.extend(labels.cpu().numpy())
                all_preds.extend(preds.cpu().numpy())
                all_probs.extend(probs.cpu().numpy())

        total = len(all_targets)
        val_loss = running_loss / total
        val_metrics = calculate_metrics(all_targets, all_preds, all_probs, class_names=self.config.CLASS_NAMES)
        val_acc = val_metrics["accuracy"]

        return val_loss, val_acc, val_metrics

    def fit(self, epochs: int = None) -> Dict[str, Any]:
        """
        Executes full training loop over specified epochs, saving the best model weights.
        """
        if epochs is None:
            epochs = self.config.NUM_EPOCHS

        logger.info(f"Starting training for {epochs} epochs on device '{self.device}'...")
        start_time = time.time()

        patience_counter = 0

        for epoch in range(1, epochs + 1):
            train_loss, train_acc = self.train_epoch()
            val_loss, val_acc, val_metrics = self.validate()

            self.scheduler.step(val_loss)

            logger.info(
                f"Epoch {epoch:02d}/{epochs:02d} | "
                f"Train Loss: {train_loss:.4f} - Train Acc: {train_acc:.4f} | "
                f"Val Loss: {val_loss:.4f} - Val Acc: {val_acc:.4f} - F1: {val_metrics['f1_score']:.4f}"
            )

            # Checkpoint save on improvement
            if val_loss < self.best_val_loss:
                self.best_val_loss = val_loss
                self.best_metrics = val_metrics
                patience_counter = 0
                self.save_checkpoint(epoch, val_loss, val_metrics)
                logger.info(f"--> Saved best model checkpoint at epoch {epoch}")
            else:
                patience_counter += 1
                if patience_counter >= self.config.PATIENCE:
                    logger.info(f"Early stopping triggered after {epoch} epochs.")
                    break

        elapsed = time.time() - start_time
        logger.info(f"Training completed in {elapsed / 60:.2f} minutes.")
        return self.best_metrics

    def save_checkpoint(self, epoch: int, val_loss: float, val_metrics: Dict[str, Any]):
        """Saves PyTorch state dict and model metadata to saved_models directory."""
        best_model_path = self.config.get_best_model_path()
        metadata_path = self.config.get_metadata_path()

        checkpoint = {
            "epoch": epoch,
            "model_name": self.config.MODEL_NAME,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "val_loss": val_loss,
            "metrics": val_metrics,
            "class_names": self.config.CLASS_NAMES,
        }

        torch.save(checkpoint, best_model_path)

        metadata = {
            "model_name": self.config.MODEL_NAME,
            "epoch": epoch,
            "val_loss": round(val_loss, 4),
            "metrics": val_metrics,
            "class_names": self.config.CLASS_NAMES,
            "image_size": self.config.IMAGE_SIZE,
            "saved_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }

        with open(metadata_path, "w") as f:
            json.dump(metadata, f, indent=2)
