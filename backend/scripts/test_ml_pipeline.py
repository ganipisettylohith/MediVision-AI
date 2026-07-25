import sys
from pathlib import Path

# Set path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def test_imports_and_predictor():
    print("Testing ML Pipeline Imports...")
    from app.ml.config import MLConfig
    from app.ml.model import ChestXRayClassifier
    from app.ml.dataset import get_transforms
    from app.ml.metrics import calculate_metrics
    from app.ml.predictor import get_predictor
    from scripts.create_sample_dataset import create_sample_dataset

    print("All ML modules imported successfully!")

    # Test predictor on synthetic image
    print("Testing ChestXRayPredictor on sample synthetic image...")
    sample_dir = backend_dir / "data" / "chest_xray"
    create_sample_dataset(sample_dir)

    sample_img_path = sample_dir / "train" / "PNEUMONIA" / "sample_pneumonia_001.png"
    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()

    predictor = get_predictor()
    result = predictor.predict(image_input=img_bytes, modality="X-Ray")

    print("Inference Result:")
    print(f"  Prediction Class : {result['prediction_class']}")
    print(f"  Confidence Score : {result['confidence_score']}")
    print(f"  Probabilities    : {result['probabilities']}")
    print(f"  Findings Summary : {result['findings_summary']}")
    print("Test completed successfully!")

if __name__ == "__main__":
    test_imports_and_predictor()
