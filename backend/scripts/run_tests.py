import io
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from PIL import Image

try:
    from fastapi.testclient import TestClient
    from app.main import app
    FASTAPI_AVAILABLE = True
except ImportError as e:
    FASTAPI_AVAILABLE = False
    IMPORT_ERROR = str(e)


def create_dummy_image_bytes():
    """Generates synthetic 224x224 RGB image bytes for API testing."""
    img = Image.new("RGB", (224, 224), color=(100, 150, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestMediVisionAPI(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if not FASTAPI_AVAILABLE:
            raise unittest.SkipTest(f"Missing required packages: {IMPORT_ERROR}. Run 'pip install -r requirements.txt'")
        cls.client = TestClient(app)

    def test_01_health_check(self):
        """Tests GET /api/v1/health endpoint."""
        response = self.client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("pytorch_available", data)

    def test_02_predict(self):
        """Tests POST /api/v1/predict image upload endpoint."""
        img_bytes = create_dummy_image_bytes()
        files = {"file": ("test_scan.png", img_bytes, "image/png")}
        data = {"modality": "X-Ray", "patient_id": "TEST-PAT-001"}

        response = self.client.post("/api/v1/predict", files=files, data=data)
        self.assertEqual(response.status_code, 201)
        res_json = response.json()

        self.assertIn("id", res_json)
        self.assertIn("prediction_class", res_json)
        self.assertIn(res_json["prediction_class"], ["NORMAL", "PNEUMONIA"])
        self.assertIsNotNone(res_json["medical_report"])

    def test_03_statistics(self):
        """Tests GET /api/v1/statistics endpoint."""
        response = self.client.get("/api/v1/statistics")
        self.assertEqual(response.status_code, 200)
        stats = response.json()

        self.assertIn("total_scans", stats)
        self.assertIn("normal_scans", stats)
        self.assertIn("pneumonia_scans", stats)
        self.assertGreaterEqual(stats["total_scans"], 1)

    def test_04_history_list(self):
        """Tests GET /api/v1/history endpoint."""
        response = self.client.get("/api/v1/history?query=TEST-PAT-001&limit=10")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("total", data)
        self.assertIn("scans", data)
        self.assertGreaterEqual(len(data["scans"]), 1)

    def test_05_get_single_history_and_pdf(self):
        """Tests GET /api/v1/history/{id} and GET /api/v1/reports/{id}/pdf endpoints."""
        history_resp = self.client.get("/api/v1/history?limit=1")
        self.assertEqual(history_resp.status_code, 200)
        scans = history_resp.json()["scans"]
        self.assertGreater(len(scans), 0)

        scan_id = scans[0]["id"]

        detail_resp = self.client.get(f"/api/v1/history/{scan_id}")
        self.assertEqual(detail_resp.status_code, 200)

        pdf_resp = self.client.get(f"/api/v1/reports/{scan_id}/pdf")
        self.assertEqual(pdf_resp.status_code, 200)
        self.assertEqual(pdf_resp.headers["content-type"], "application/pdf")
        self.assertGreater(len(pdf_resp.content), 500)


if __name__ == "__main__":
    unittest.main()
