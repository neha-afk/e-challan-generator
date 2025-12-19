import cv2
import os
import math
import numpy as np
from collections import defaultdict, deque
from ultralytics import YOLO
from utils.config import PROJECT_ROOT, MODEL_PATH, VIDEO_SOURCE, VEHICLE_CLASSES

# Constants for Speed Calculation
# CALIBRATION CONSTANTS
# Meters per Pixel: Adjusted to 0.01 based on user feedback.
# FPS: Assumed 30 frames per second.
DEFAULT_METERS_PER_PIXEL = 0.01
DEFAULT_FPS = 30

class SpeedTracker:
    def __init__(self, meters_per_pixel=DEFAULT_METERS_PER_PIXEL, fps=DEFAULT_FPS):
        self.meters_per_pixel = meters_per_pixel
        self.fps = fps
        self.points_per_second = fps # frames per second
        # If speed is calculated per frame, time elapsed is 1/FPS
        self.time_per_frame = 1.0 / self.fps
        
        self.previous_positions = {} # {track_id: (x, y)}
        self.speed_history = defaultdict(lambda: deque(maxlen=5)) # Store last 5 speeds for smoothing
        self.track_ages = defaultdict(int) # {track_id: age_in_frames}
        self.last_valid_speed = {} # {track_id: speed_kmh}

    def get_last_speed(self, track_id):
        """Returns the last calculated valid speed for a track_id."""
        return self.last_valid_speed.get(track_id, 0)

    def calculate_speed(self, track_id, centroid, time_elapsed=None):
        cx, cy = centroid
        speed = 0
        
        # Determine time delta (Default to 1 frame time if not provided)
        dt = time_elapsed if time_elapsed else self.time_per_frame
        
        # Increment track age
        self.track_ages[track_id] += 1
        
        if track_id in self.previous_positions:
            prev_cx, prev_cy = self.previous_positions[track_id]
            
            # Euclidean distance in pixels
            distance_pixels = math.sqrt((cx - prev_cx)**2 + (cy - prev_cy)**2)
            
            # Convert to meters using the scaling factor
            # Formula: distance_meters = pixels * meters_per_pixel
            distance_meters = distance_pixels * self.meters_per_pixel
            
            # Speed (m/s) = distance / time
            speed_mps = distance_meters / dt
            
            # Convert to km/h (1 m/s = 3.6 km/h)
            speed_kmh = speed_mps * 3.6
            
            # --- Sanity Check 1: Ignore Unrealistic High Speeds (> 150 km/h) ---
            if speed_kmh > 150:
                 # Noise spike? Return last known valid speed or 0
                 speed_kmh = self.last_valid_speed.get(track_id, 0)
            else:
                 self.last_valid_speed[track_id] = speed_kmh

            # --- Sanity Check 2: Ignore Tiny Movements (< 1 km/h) ---
            if speed_kmh < 1:
                speed_kmh = 0
            
            # Smoothing (Moving Average)
            self.speed_history[track_id].append(speed_kmh)
            avg_speed = sum(self.speed_history[track_id]) / len(self.speed_history[track_id])
            
            # Clamp Speed to realistic values
            speed = max(0, min(avg_speed, 150)) 
            
            # --- Minimum Track Age Filter ---
            if self.track_ages[track_id] < 10:
                speed = 0

        # Update position
        self.previous_positions[track_id] = (cx, cy)
        return speed

def main():
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model not found at {MODEL_PATH}")
        return

    print(f"Loading YOLOv8 model from: {MODEL_PATH}")
    model = YOLO(MODEL_PATH)

    video_path = VIDEO_SOURCE
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"Error: Could not open video file: {video_path}")
        return

    speed_tracker = SpeedTracker()

    print(f"Calculating speed on video: {video_path}...")
    print("Press 'q' to exit.")

    while True:
        success, frame = cap.read()
        if not success:
            print("End of video.")
            break

        # resize for consistency if needed, assuming 1280x720 from config logic
        # frame = cv2.resize(frame, (1280, 720))

        # Track
        results = model.track(frame, persist=True, conf=0.5, classes=VEHICLE_CLASSES, verbose=False, tracker="bytetrack.yaml")
        
        annotated_frame = frame.copy()

        if results[0].boxes.id is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            track_ids = results[0].boxes.id.int().cpu().numpy()
            cls_ids = results[0].boxes.cls.int().cpu().numpy()

            for box, track_id, cls in zip(boxes, track_ids, cls_ids):
                x1, y1, x2, y2 = map(int, box)
                
                # Calculate Centroid
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2
                
                # Get Speed
                speed = speed_tracker.calculate_speed(track_id, (cx, cy))
                
                # Visualize
                color = (0, 255, 0)
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                
                label = f"ID:{track_id} {speed:.1f} km/hr"
                cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
                # Draw centroid
                cv2.circle(annotated_frame, (cx, cy), 4, (0, 0, 255), -1)

        cv2.imshow("YOLOv8 Speed Estimation", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
