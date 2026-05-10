import os

from dotenv import load_dotenv

load_dotenv()


def _build_db_uri():
    # If DATABASE_URL is explicitly set, use it
    url = os.getenv("DATABASE_URL")
    if url:
        return url
    
    # Check if we should use SQLite for development
    db_type = os.getenv("DB_TYPE", "postgresql").lower()
    if db_type == "sqlite":
        return "sqlite:///smart_tasks.db"

    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "smart_tasks")
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-change-me")
    SQLALCHEMY_DATABASE_URI = _build_db_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
