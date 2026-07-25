import os
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional
import torch
from torch.utils.data import DataLoader, Dataset
import torchvision.transforms as transforms
from torchvision.datasets import ImageFolder
from PIL import Image

from app.ml.config import MLConfig, ml_config

logger = logging.getLogger(__name__)


def get_transforms(image_size: int = 224, mean=None, std=None) -> Tuple[transforms.Compose, transforms.Compose]:
    """
    Returns torchvision transformation pipelines for training and validation/inference.
    """
    if mean is None:
        mean = ml_config.MEAN
    if std is None:
        std = ml_config.STD

    train_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),
    ])

    return train_transform, val_transform


class ChestXRayDataset(Dataset):
    """
    Custom PyTorch dataset wrapper for single image array or custom file paths list.
    """
    def __init__(self, file_paths: list, labels: list, transform=None):
        self.file_paths = file_paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.file_paths)

    def __getitem__(self, idx: int):
        img_path = self.file_paths[idx]
        image = Image.open(img_path).convert("RGB")
        label = torch.tensor(self.labels[idx], dtype=torch.long)

        if self.transform:
            image = self.transform(image)

        return image, label


def create_dataloaders(
    data_dir: str,
    batch_size: int = 32,
    image_size: int = 224,
    num_workers: int = 0
) -> Dict[str, DataLoader]:
    """
    Creates PyTorch DataLoaders for train, val, and test splits from a standard ImageFolder directory structure.
    Expected structure:
      data_dir/
        train/
          NORMAL/
          PNEUMONIA/
        val/
          ...
        test/
          ...
    """
    train_transform, val_transform = get_transforms(image_size=image_size)
    data_path = Path(data_dir)

    loaders = {}
    splits = ["train", "val", "test"]

    for split in splits:
        split_dir = data_path / split
        if not split_dir.exists():
            logger.warning(f"Split directory '{split_dir}' does not exist. Skipping {split} DataLoader.")
            continue

        transform = train_transform if split == "train" else val_transform
        dataset = ImageFolder(root=str(split_dir), transform=transform)
        shuffle = (split == "train")

        loaders[split] = DataLoader(
            dataset,
            batch_size=batch_size,
            shuffle=shuffle,
            num_workers=num_workers,
            pin_memory=torch.cuda.is_available()
        )
        logger.info(f"Loaded '{split}' dataset with {len(dataset)} samples.")

    return loaders
