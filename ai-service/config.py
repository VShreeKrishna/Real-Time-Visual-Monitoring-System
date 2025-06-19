import os
from dotenv import load_dotenv

load_dotenv()

# Camera settings
CAMERA_INDEX = int(os.getenv('CAMERA_INDEX', 0))
CAMERA_WIDTH = int(os.getenv('CAMERA_WIDTH', 640))
CAMERA_HEIGHT = int(os.getenv('CAMERA_HEIGHT', 480))
CAMERA_FPS = int(os.getenv('CAMERA_FPS', 30))

# AI Model settings
CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', 0.5))
MODEL_PATH = os.getenv('MODEL_PATH', './saved_models/')

# API settings
NODEJS_API_URL = os.getenv('NODEJS_API_URL', 'http://localhost:5000')

# Image settings
IMAGE_SAVE_PATH = os.getenv('IMAGE_SAVE_PATH', '../uploads/events/')
IMAGE_QUALITY = int(os.getenv('IMAGE_QUALITY', 85))
MAX_IMAGE_SIZE_KB = int(os.getenv('MAX_IMAGE_SIZE_KB', 200))

# Event detection settings
EVENT_COOLDOWN_SECONDS = int(os.getenv('EVENT_COOLDOWN_SECONDS', 5))
PROCESS_EVERY_N_FRAMES = int(os.getenv('PROCESS_EVERY_N_FRAMES', 5))

# Logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

print("🔧 Configuration loaded successfully")