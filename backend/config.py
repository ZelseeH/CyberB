import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "dev-secret-key-change-in-production"

    basedir = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(
        basedir, "database", "cyberb.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT Configuration
    JWT_SECRET_KEY = (
        os.environ.get("JWT_SECRET_KEY") or "jwt-secret-key-change-in-production"
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
