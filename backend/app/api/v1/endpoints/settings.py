import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User, UserSettings
from app.schemas.auth_schemas import UserSettingsSchema
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/settings", response_model=UserSettingsSchema, summary="Get Current User Preferences")
def get_user_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Fetches stored preferences (theme, notification preferences, default page size) for the authenticated user.
    """
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)
        db.commit()
        db.refresh(user_settings)

    return UserSettingsSchema.from_orm(user_settings)


@router.put("/settings", response_model=UserSettingsSchema, summary="Update User Preferences")
def update_user_settings(payload: UserSettingsSchema, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Updates user preferences in database.
    """
    user_settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not user_settings:
        user_settings = UserSettings(user_id=current_user.id)
        db.add(user_settings)

    user_settings.theme = payload.theme
    user_settings.notifications_enabled = payload.notifications_enabled
    user_settings.default_page_size = payload.default_page_size

    db.commit()
    db.refresh(user_settings)
    logger.info(f"Updated user settings for user #{current_user.id}: {payload.dict()}")

    return UserSettingsSchema.from_orm(user_settings)
