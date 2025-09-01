import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration class for Drone Analysis API"""
    
    # Flask Configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key-here')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    PORT = int(os.getenv('PORT', 5001))
    
    # File Upload Configuration
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', './uploads')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 100 * 1024 * 1024))  # 100MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'tif'}
    
    # AI Model Configuration
    MODEL_PATH = os.getenv('MODEL_PATH', './models/vegetation_detection.h5')
    CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', 0.7))
    VEGETATION_INDEX_THRESHOLD = float(os.getenv('VEGETATION_INDEX_THRESHOLD', 0.3))
    
    # CO2 Estimation Configuration
    CO2_PER_SQM = float(os.getenv('CO2_PER_SQM', 0.5))  # kg CO2 per sqm of vegetation
    VEGETATION_DENSITY_MULTIPLIER = float(os.getenv('VEGETATION_DENSITY_MULTIPLIER', 1.2))
    
    # Blockchain API Configuration
    BLOCKCHAIN_API_URL = os.getenv('BLOCKCHAIN_API_URL', 'http://localhost:3000/api')
    BLOCKCHAIN_API_KEY = os.getenv('BLOCKCHAIN_API_KEY', '')
    BLOCKCHAIN_TIMEOUT = int(os.getenv('BLOCKCHAIN_TIMEOUT', 30))
    
    # Database Configuration (if needed)
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///drone_analysis.db')
    
    # Redis Configuration (for Celery)
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', './logs/drone_analysis.log')
    
    # Rate Limiting
    RATE_LIMIT_DEFAULT = os.getenv('RATE_LIMIT_DEFAULT', '100 per minute')
    RATE_LIMIT_STORAGE_URL = os.getenv('RATE_LIMIT_STORAGE_URL', 'memory://')
    
    # CORS Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    
    # Image Processing Configuration
    IMAGE_RESIZE_WIDTH = int(os.getenv('IMAGE_RESIZE_WIDTH', 1024))
    IMAGE_RESIZE_HEIGHT = int(os.getenv('IMAGE_RESIZE_HEIGHT', 1024))
    IMAGE_QUALITY = int(os.getenv('IMAGE_QUALITY', 85))
    
    # Vegetation Analysis Configuration
    NDVI_RED_BAND = int(os.getenv('NDVI_RED_BAND', 2))  # Red band index
    NDVI_NIR_BAND = int(os.getenv('NDVI_NIR_BAND', 3))  # Near-infrared band index
    MIN_VEGETATION_AREA = float(os.getenv('MIN_VEGETATION_AREA', 0.01))  # 1% of image
    
    # Drone Metadata Configuration
    REQUIRED_METADATA = [
        'latitude', 'longitude', 'altitude', 'timestamp', 
        'drone_id', 'camera_model', 'image_resolution'
    ]
    
    # Output Configuration
    OUTPUT_FORMAT = os.getenv('OUTPUT_FORMAT', 'json')  # json, xml, csv
    SAVE_PROCESSED_IMAGES = os.getenv('SAVE_PROCESSED_IMAGES', 'True').lower() == 'true'
    PROCESSED_IMAGES_PATH = os.getenv('PROCESSED_IMAGES_PATH', './processed_images')
    
    # Error Handling
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', 3))
    RETRY_DELAY = int(os.getenv('RETRY_DELAY', 5))  # seconds
    
    @staticmethod
    def init_app(app):
        """Initialize application with configuration"""
        # Create necessary directories
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(Config.PROCESSED_IMAGES_PATH, exist_ok=True)
        os.makedirs(os.path.dirname(Config.LOG_FILE), exist_ok=True)
        
        # Set Flask configuration
        app.config['SECRET_KEY'] = Config.SECRET_KEY
        app.config['MAX_CONTENT_LENGTH'] = Config.MAX_CONTENT_LENGTH
        app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER
