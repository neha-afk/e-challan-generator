from ultralytics import YOLO
import torch

try:
    print("Attempting to load license_plate.pt...")
    model = YOLO("models/license_plate.pt")
    print("Success!")
except Exception as e:
    print(f"Failed to load model: {e}")
    import traceback
    traceback.print_exc()
