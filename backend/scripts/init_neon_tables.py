import sys
from pathlib import Path

# Add backend directory to python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import Base, engine
from app.models import User, UserSettings, MedicalScan


def init_db():
    print(f"Connecting to database: {engine.url.render_as_string(hide_password=True)}")
    print("Creating all database tables (users, user_settings, medical_scans)...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully!")


if __name__ == "__main__":
    init_db()
