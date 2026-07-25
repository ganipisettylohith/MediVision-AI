import sys
from pathlib import Path
from PIL import Image

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

def test_xai():
    print("Testing Grad-CAM XAI Pipeline...")
    from app.ml.predictor import get_predictor
    from scripts.create_sample_dataset import create_sample_dataset

    sample_dir = backend_dir / "data" / "chest_xray"
    create_sample_dataset(sample_dir)

    sample_img_path = sample_dir / "train" / "PNEUMONIA" / "sample_pneumonia_001.png"
    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()

    predictor = get_predictor()
    result = predictor.predict(image_input=img_bytes, modality="X-Ray")

    print("=== XAI Pipeline Result ===")
    print(f"  Prediction Class : {result['prediction_class']}")
    print(f"  Confidence Score : {result['confidence_score']}")
    print(f"  Original URL     : {result['original_url']}")
    print(f"  Heatmap URL      : {result['heatmap_url']}")
    print(f"  Overlay URL      : {result['overlay_url']}")
    print(f"  AI Explanation   : {result['ai_explanation']}")
    print("XAI verification complete!")

if __name__ == "__main__":
    test_xai()
