import os
import sys
from pathlib import Path
import numpy as np
from PIL import Image

# Ensure backend path is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


def generate_synthetic_xray(file_path: Path, label: str):
    """
    Generates synthetic grayscale X-ray mock image for testing pipeline execution.
    """
    width, height = 224, 224
    if label == "PNEUMONIA":
        # Add opacity simulation noise
        data = np.random.randint(80, 220, (height, width, 3), dtype=np.uint8)
        data[80:160, 80:160, :] = np.random.randint(180, 255, (80, 80, 3), dtype=np.uint8)
    else:
        # Normal scan background
        data = np.random.randint(40, 160, (height, width, 3), dtype=np.uint8)

    img = Image.fromarray(data)
    img.save(file_path)


def create_sample_dataset(output_dir: str = None) -> Path:
    if output_dir is None:
        output_dir = backend_dir / "data" / "chest_xray"
    else:
        output_dir = Path(output_dir)

    splits = {
        "train": {"NORMAL": 20, "PNEUMONIA": 20},
        "val": {"NORMAL": 5, "PNEUMONIA": 5},
        "test": {"NORMAL": 5, "PNEUMONIA": 5},
    }

    print(f"Creating sample Chest X-ray dataset directory at '{output_dir}'...")

    for split, categories in splits.items():
        for category, count in categories.items():
            cat_dir = output_dir / split / category
            os.makedirs(cat_dir, exist_ok=True)
            for i in range(1, count + 1):
                file_path = cat_dir / f"sample_{category.lower()}_{i:03d}.png"
                if not file_path.exists():
                    generate_synthetic_xray(file_path, category)

    print("Sample dataset successfully created!")
    return output_dir


if __name__ == "__main__":
    create_sample_dataset()
