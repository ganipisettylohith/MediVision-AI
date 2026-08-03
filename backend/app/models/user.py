from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    """
    SQLAlchemy model representing system users for authentication & authorization.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="clinician")  # clinician vs admin
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


    # Relationships
    scans = relationship("MedicalScan", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("MedicalReportDocument", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")



class UserSettings(Base):
    """
    SQLAlchemy model storing per-user custom application preferences.
    """
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    theme = Column(String(50), default="dark", nullable=False)
    notifications_enabled = Column(Boolean, default=True, nullable=False)
    default_page_size = Column(Integer, default=10, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="settings")
