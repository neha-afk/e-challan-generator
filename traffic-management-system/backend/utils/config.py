# utils/config.py
import os

# Base Directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # traffic-management-system/backend
PROJECT_ROOT = os.path.dirname(BASE_DIR) # traffic-management-system

# YOLOv8 Class IDs for vehicles (COCO dataset)
VEHICLE_CLASSES = [1, 2, 3, 5, 7]  # 1: bicycle, 2: car, 3: motorcycle, 5: bus, 7: truck

# Model Path
MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "yolov8n.pt")

# Video Settings
# Using traffic.mp4 as found in directory, fell back to defaults if not found
VIDEO_SOURCE = os.path.join(PROJECT_ROOT, "videos", "traffic.mp4")
frame_width = 1280
frame_height = 720

# Speed Limits (km/h)
SPEED_LIMIT = 60

# ROI for Speed Estimation (Source Points) [Top-Left, Top-Right, Bottom-Right, Bottom-Left]
# NOTE: These points should be calibrated based on the specific camera angle
SOURCE_POINTS = [(350, 450), (930, 450), (1280, 720), (0, 720)]
REAL_WIDTH = 10  # meters (approx road width for 3 lanes)
REAL_HEIGHT = 20 # meters (approx length of the road section in view)

