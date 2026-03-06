import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', os.urandom(32).hex())
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///smart_attendance.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', os.urandom(32).hex())
    JWT_EXPIRATION_SECONDS = 30  # QR code refresh every 30 seconds
    QR_ENCRYPTION_KEY = os.environ.get('QR_ENCRYPTION_KEY', os.urandom(32).hex())
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
