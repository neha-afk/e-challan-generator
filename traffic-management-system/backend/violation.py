import cv2
import os
import math
from ultralytics import YOLO
from utils.config import PROJECT_ROOT, MODEL_PATH, VIDEO_SOURCE, VEHICLE_CLASSES
from speed_calculation import SpeedTracker
from snapshot import capture_snapshot
from challan import generate_challan
from database import save_violation
import datetime

# Constants
# Constants
LANE_1_LIMIT = 4   # km/h
LANE_2_LIMIT = 5   # km/h
LANE_DIVIDER_X = 640 # Approx middle of 1280 width

class ViolationDetector:
    def __init__(self):
        self.violated_vehicles = set() # Store IDs of vehicles that have already triggered a violation
        self.overspeed_counter = {} # To track how long a vehicle has been overspeeding (if needed for future logic)
        self.last_check_time = 0 # Initialize last check time for system reset logic

    def check_violation(self, track_id, speed, position, frame, bbox, plate=None):
        """
        Checks if vehicle is overspeeding in its respective lane.
        """
        # Check for system reset
        from utils import system_state
        import time
        if getattr(self, 'last_check_time', 0) < system_state.get_last_reset_time():
            self.violated_vehicles.clear()
            self.overspeed_counter.clear()
            self.last_check_time = time.time()
            print("[SPEED] Detector state reset due to system clear.")
            
        # Determine Lane First
        cx, cy = position
        if cx < LANE_DIVIDER_X:
            lane = "Lane 1"
            limit = LANE_1_LIMIT
        else:
            lane = "Lane 2"
            limit = LANE_2_LIMIT
            
        # Already handled?
        if track_id in self.violated_vehicles:
            return True, lane, limit # Return True so visual kept RED
        
        is_violation = False
        
        # --- Sustained Overspeed Logic ---
        if speed > limit:
            self.overspeed_counter[track_id] = self.overspeed_counter.get(track_id, 0) + 1
        else:
            self.overspeed_counter[track_id] = 0 # Reset immediately if speed drops
            
        # Trigger Limit
        OVERSPEED_FRAMES_THRESHOLD = 5
        
        if self.overspeed_counter.get(track_id, 0) >= OVERSPEED_FRAMES_THRESHOLD:
            is_violation = True
            
            if track_id not in self.violated_vehicles:
                self.violated_vehicles.add(track_id)
                plate_str = plate if plate else f"ID-{track_id}"
                print(f"VIOLATION DETECTED: {plate_str} (ID {track_id}) in {lane} doing {speed:.1f} km/h (Limit: {limit})")
                
                # Capture Snapshot
                snapshot_path = capture_snapshot(frame, track_id, speed, bbox)
                
                # Generate E-Challan
                if snapshot_path:
                    data = {
                        'id': str(track_id),
                        'plate': plate_str, # Store Plate
                        'timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        'speed': speed,
                        'limit': limit,
                        'lane': lane,
                        'violation_type': 'Overspeed', # Explicit type
                        'snapshot_path': snapshot_path,
                        'challan_path': f"challans/Challan_{track_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf" 
                    }
                    # Generate Challan (returns actual path)
                    challan_path = generate_challan(data)
                    data['challan_path'] = challan_path # Update with actual path
                    
                    # Save to Database
                    save_violation(data)
        
        return is_violation, lane, limit

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

    # Initialize Modules
    speed_tracker = SpeedTracker()
    violation_detector = ViolationDetector()

    print(f"Checking violations on video: {video_path}...")
    print(f"Lane 1 Limit: {LANE_1_LIMIT} km/h | Lane 2 Limit: {LANE_2_LIMIT} km/h")
    print("Press 'q' to exit.")

    while True:
        success, frame = cap.read()
        if not success:
            print("End of video.")
            break

        # Track
        results = model.track(frame, persist=True, conf=0.5, classes=VEHICLE_CLASSES, verbose=False, tracker="bytetrack.yaml")
        
        annotated_frame = frame.copy()
        
        # Draw Lane Divider
        cv2.line(annotated_frame, (LANE_DIVIDER_X, 0), (LANE_DIVIDER_X, 720), (255, 255, 0), 2)
        cv2.putText(annotated_frame, f"Lane 1 (Limit: {LANE_1_LIMIT})", (100, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
        cv2.putText(annotated_frame, f"Lane 2 (Limit: {LANE_2_LIMIT})", (740, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)

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
                
                # Check Violation
                is_violation, lane, limit = violation_detector.check_violation(track_id, speed, (cx, cy), frame, (x1, y1, x2, y2))
                
                # Visualize
                color = (0, 255, 0) # Green
                status = "OK"
                
                if is_violation or track_id in violation_detector.violated_vehicles:
                    color = (0, 0, 255) # Red
                    status = "OVERSPEED"
                
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                
                label = f"ID:{track_id} {speed:.1f} km/h"
                cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
                if status == "OVERSPEED":
                    cv2.putText(annotated_frame, status, (x1, y1 - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                
                # Draw centroid
                cv2.circle(annotated_frame, (cx, cy), 4, color, -1)

        cv2.imshow("Traffic Violation Detection", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
