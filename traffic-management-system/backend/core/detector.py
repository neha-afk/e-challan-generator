# core/detector.py
import cv2
from ultralytics import YOLO
from utils.config import MODEL_PATH, VEHICLE_CLASSES

class VehicleDetector:
    def __init__(self, model_path=MODEL_PATH):
        print(f"Loading YOLOv8 model from {model_path}...")
        self.model = YOLO(model_path)
        self.vehicle_classes = VEHICLE_CLASSES

    def detect_and_track(self, frame):
        """
        Detects and tracks vehicles in the given frame.
        Returns the tracks containing (id, x1, y1, x2, y2, class_id).
        """
        # Persist=True is important for tracking to maintain IDs across frames
        results = self.model.track(frame, persist=True, verbose=False, classes=self.vehicle_classes)
        
        tracks = []
        if results[0].boxes.id is not None:
             # Get boxes (xyxy), track IDs, and classes
            boxes = results[0].boxes.xyxy.cpu().numpy()
            track_ids = results[0].boxes.id.int().cpu().numpy()
            cls_ids = results[0].boxes.cls.int().cpu().numpy()

            for box, track_id, cls in zip(boxes, track_ids, cls_ids):
                x1, y1, x2, y2 = box
                tracks.append((int(track_id), int(x1), int(y1), int(x2), int(y2), int(cls)))
        
        return tracks
