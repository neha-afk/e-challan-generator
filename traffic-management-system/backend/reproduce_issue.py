
import sys
import os
from ultralytics import YOLO

# Add parent directory to path if needed, though here we just load the model
# Mock the path to match where the script is run or absolute path
MODEL_PATH = r"c:\Users\neha\Desktop\carrot\traffic-management-system\models\license_plate.pt"

print(f"Attempting to load model from: {MODEL_PATH}")

try:
    model = YOLO(MODEL_PATH)
    print("Success! Model loaded.")
except Exception as e:
    print("Caught expected error:")
    print(e)
    import traceback
    traceback.print_exc()
