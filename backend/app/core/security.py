import os
import hmac
import hashlib
import json
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User

# JWT Constants
SECRET_KEY = getattr(settings, "SECRET_KEY", "medivision_secret_jwt_key_90428174291_xai_llm")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

security_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """
    Hashes a plaintext password using PBKDF2-HMAC-SHA256 with a random 16-byte salt.
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a stored PBKDF2 hash.
    """
    try:
        if ":" not in hashed_password:
            return False
        salt_hex, key_hex = hashed_password.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        computed_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(computed_key, expected_key)
    except Exception:
        return False


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def _base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - (len(data) % 4))
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates an HS256 signed JWT access token.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": int(expire.timestamp()), "type": "access"})
    
    header = {"alg": "HS256", "typ": "JWT"}
    header_bytes = _base64url_encode(json.dumps(header).encode('utf-8'))
    payload_bytes = _base64url_encode(json.dumps(to_encode).encode('utf-8'))
    
    signing_input = f"{header_bytes}.{payload_bytes}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_bytes = _base64url_encode(signature)
    
    return f"{header_bytes}.{payload_bytes}.{signature_bytes}"


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates an HS256 signed JWT refresh token (longer lived).
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)  # 7 days expiration
    
    to_encode.update({"exp": int(expire.timestamp()), "type": "refresh"})
    
    header = {"alg": "HS256", "typ": "JWT"}
    header_bytes = _base64url_encode(json.dumps(header).encode('utf-8'))
    payload_bytes = _base64url_encode(json.dumps(to_encode).encode('utf-8'))
    
    signing_input = f"{header_bytes}.{payload_bytes}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_bytes = _base64url_encode(signature)
    
    return f"{header_bytes}.{payload_bytes}.{signature_bytes}"


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decodes and verifies an HS256 signed JWT access token.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        
        header_bytes, payload_bytes, signature_bytes = parts
        signing_input = f"{header_bytes}.{payload_bytes}".encode('utf-8')
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_sig = _base64url_decode(signature_bytes)
        
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        
        payload_data = json.loads(_base64url_decode(payload_bytes).decode('utf-8'))
        exp = payload_data.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            return None
            
        return payload_data
    except Exception:
        return None


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency returning current user or falling back to default system user.
    """
    if auth and auth.credentials:
        payload = decode_access_token(auth.credentials)
        if payload and payload.get("sub"):
            try:
                user_id = int(payload.get("sub"))
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return user
            except (ValueError, TypeError):
                pass

    # Fallback to default user
    default_user = db.query(User).first()
    if not default_user:
        default_user = User(
            full_name="MediVision User",
            email="user@medivision.ai",
            hashed_password=hash_password("medivision_default_pass"),
            role="admin"  # Make first user admin for ease of setup
        )
        db.add(default_user)
        db.commit()
        db.refresh(default_user)

    return default_user


def require_role(allowed_roles: list[str]):
    """Enforces specific user roles for endpoints."""
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: one of {allowed_roles}."
            )
        return current_user
    return dependency


require_clinician = require_role(["clinician", "admin"])
require_admin = require_role(["admin"])

