import os
import logging
import time
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# Attempt importing google.generativeai SDK if available
try:
    import google.generativeai as genai
    GENAI_SDK_AVAILABLE = True
except ImportError:
    GENAI_SDK_AVAILABLE = False


class GeminiClient:
    """
    Reusable client for Google Gemini API with timeout handling, retries, and fallback support.
    """
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.model_name = model_name or settings.GEMINI_MODEL or "gemini-1.5-flash"
        
        if self.api_key and GENAI_SDK_AVAILABLE:
            try:
                genai.configure(api_key=self.api_key)
                self.sdk_client = genai.GenerativeModel(self.model_name)
                logger.info(f"Initialized Gemini SDK Client with model '{self.model_name}'.")
            except Exception as e:
                logger.error(f"Failed to configure Gemini SDK: {e}")
                self.sdk_client = None
        else:
            self.sdk_client = None

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 0)

    def generate_text(self, prompt: str, timeout_seconds: float = 12.0, max_retries: int = 2) -> Optional[str]:
        """
        Sends prompt to Gemini API with retries and timeout enforcement.
        """
        if not self.is_configured():
            logger.warning("Gemini API key is not configured. Falling back to local report template.")
            return None

        # Method 1: Using google-generativeai SDK if available
        if self.sdk_client is not None:
            for attempt in range(1, max_retries + 1):
                try:
                    logger.info(f"Sending request to Gemini SDK (attempt {attempt}/{max_retries})...")
                    response = self.sdk_client.generate_content(
                        prompt,
                        generation_config={"temperature": 0.2, "response_mime_type": "application/json"}
                    )
                    if response and response.text:
                        return response.text
                except Exception as e:
                    logger.warning(f"Gemini SDK attempt {attempt} failed: {e}")
                    time.sleep(1.0)

        # Method 2: Direct REST HTTP request fallback using httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
        }

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Sending REST request to Gemini API (attempt {attempt}/{max_retries})...")
                with httpx.Client(timeout=timeout_seconds) as client:
                    resp = client.post(url, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "")
            except Exception as e:
                logger.warning(f"Gemini REST API attempt {attempt} failed: {e}")
                time.sleep(1.0)

        return None


_gemini_client_instance = None


def get_gemini_client() -> GeminiClient:
    global _gemini_client_instance
    if _gemini_client_instance is None:
        _gemini_client_instance = GeminiClient()
    return _gemini_client_instance
