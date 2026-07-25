from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of user")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, description="Password min 8 characters")
    confirm_password: str = Field(..., min_length=8, description="Matching confirm password")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_new_password: str = Field(..., min_length=8)


class UserDeleteConfirm(BaseModel):
    password_or_confirm: str = Field(..., description="Password or 'DELETE' string to confirm deletion")


class UserSettingsSchema(BaseModel):
    theme: str = "dark"
    notifications_enabled: bool = True
    default_page_size: int = 10

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    created_at: datetime
    total_scans: int = 0
    last_scan_date: Optional[datetime] = None
    settings: Optional[UserSettingsSchema] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
