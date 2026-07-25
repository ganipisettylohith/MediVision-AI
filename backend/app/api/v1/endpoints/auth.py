import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.core.database import get_db
from app.models.user import User, UserSettings
from app.models.medical_image import MedicalScan
from app.schemas.auth_schemas import (
    UserRegister, UserLogin, UserResponse, UserUpdate,
    PasswordChange, Token, UserSettingsSchema, UserDeleteConfirm
)
from app.core.security import (
    hash_password, verify_password, create_access_token, get_current_user
)

logger = logging.getLogger(__name__)
router = APIRouter()


def build_user_response(user: User, db: Session) -> UserResponse:
    """
    Helper function constructing UserResponse with scan telemetry stats and settings.
    """
    total_scans = db.query(func.count(MedicalScan.id)).filter(MedicalScan.user_id == user.id).scalar() or 0
    last_scan = db.query(MedicalScan.created_at).filter(MedicalScan.user_id == user.id).order_by(desc(MedicalScan.created_at)).first()
    last_scan_date = last_scan[0] if last_scan else None

    # Fetch or auto-create default settings
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == user.id).first()
    if not user_settings:
        user_settings = UserSettings(user_id=user.id)
        db.add(user_settings)
        db.commit()
        db.refresh(user_settings)

    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        created_at=user.created_at,
        total_scans=total_scans,
        last_scan_date=last_scan_date,
        settings=UserSettingsSchema.from_orm(user_settings)
    )


@router.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED, summary="Register New User Account")
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new medical user account. Validates email uniqueness, password length, and password confirmation matching.
    """
    clean_email = payload.email.strip().lower()
    
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match. Please verify your password confirmation."
        )

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    existing_user = db.query(User).filter(User.email == clean_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address is already registered. Please log in instead."
        )

    # Create User
    new_user = User(
        full_name=payload.full_name.strip(),
        email=clean_email,
        hashed_password=hash_password(payload.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default settings
    default_settings = UserSettings(user_id=new_user.id)
    db.add(default_settings)
    db.commit()

    logger.info(f"Registered new user account: '{new_user.email}' (ID: #{new_user.id})")

    # Issue JWT token
    access_token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
    user_resp = build_user_response(new_user, db)

    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.post("/auth/login", response_model=Token, summary="User Authentication & JWT Token Issuance")
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticates user credentials and issues a 24-hour JWT Bearer token.
    """
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        logger.warning(f"Failed login attempt for email '{clean_email}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password. Please check your credentials and try again."
        )

    logger.info(f"User logged in successfully: '{user.email}' (ID: #{user.id})")
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    user_resp = build_user_response(user, db)

    return Token(access_token=access_token, token_type="bearer", user=user_resp)


@router.get("/auth/me", response_model=UserResponse, summary="Get Current User Profile & Telemetry")
def get_current_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Retrieves current authenticated user profile, usage telemetry, and settings.
    """
    return build_user_response(current_user, db)


@router.put("/auth/me", response_model=UserResponse, summary="Update Full Name Profile Information")
def update_user_profile(payload: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Updates the authenticated user's full name.
    """
    if payload.full_name and payload.full_name.strip():
        current_user.full_name = payload.full_name.strip()
        db.commit()
        db.refresh(current_user)
        logger.info(f"Updated user full name for '{current_user.email}' to '{current_user.full_name}'")

    return build_user_response(current_user, db)


@router.put("/auth/change-password", status_code=status.HTTP_200_OK, summary="Change User Password")
def change_password(payload: PasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Changes current user's password after verifying current password.
    """
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password provided."
        )

    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation password do not match."
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long."
        )

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    logger.info(f"Password changed successfully for user #{current_user.id}")

    return {"message": "Password changed successfully."}


@router.post("/auth/me/delete", status_code=status.HTTP_200_OK, summary="Hard-Delete User Account with Password Re-entry")
def delete_user_account(payload: UserDeleteConfirm, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Hard-deletes current user account and purges associated scans. Requires entering current password or 'DELETE'.
    """
    confirm_val = payload.password_or_confirm.strip()
    is_password_valid = verify_password(confirm_val, current_user.hashed_password)
    is_delete_string = confirm_val.upper() == "DELETE"

    if not (is_password_valid or is_delete_string):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation. Please enter your correct current password or type 'DELETE' to confirm account deletion."
        )

    user_id = current_user.id
    user_email = current_user.email

    db.delete(current_user)
    db.commit()
    logger.info(f"Hard-deleted user account #{user_id} ({user_email}) and all associated records.")

    return {"message": f"Account '{user_email}' and all associated scans have been permanently deleted."}
