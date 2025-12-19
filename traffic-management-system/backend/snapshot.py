import cv2
import os
import datetime
from utils.config import PROJECT_ROOT

# Define Snapshot Directory
SNAPSHOT_DIR = os.path.join(PROJECT_ROOT, "snapshots")

def capture_snapshot(frame, vehicle_id, speed, bbox=None):
    """
    Saves a snapshot of the violating vehicle.
    
    Args:
        frame: The video frame (annotated or raw).
        vehicle_id: ID of the vehicle.
        speed: Detected speed.
        bbox: Optional tuple (x1, y1, x2, y2) to draw if frame is raw.
        
    Returns:
        str: Absolute path of the saved snapshot.
    """
    if not os.path.exists(SNAPSHOT_DIR):
        os.makedirs(SNAPSHOT_DIR)
        
    # Generate Timestamp
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Filename format: vehicleID_timestamp.jpg (e.g., 5_20231212_103000.jpg)
    filename = f"{vehicle_id}_{timestamp}.jpg"
    filepath = os.path.join(SNAPSHOT_DIR, filename)
    
    # Create a copy to avoid modifying the original frame stream if needed
    save_img = frame.copy()
    
    # If a bounding box is provided, ensure it's drawn (in case raw frame was passed)
    if bbox:
        x1, y1, x2, y2 = bbox
        cv2.rectangle(save_img, (x1, y1), (x2, y2), (0, 0, 255), 3)
        info_text = f"ID: {vehicle_id} | Speed: {speed:.1f} km/h"
        cv2.putText(save_img, info_text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
    # Save Image
    success = cv2.imwrite(filepath, save_img)
    
    if success:
        print(f"[SNAPSHOT SAVED] {filepath}")
        return filepath
    else:
        print(f"[ERROR] Failed to save snapshot: {filepath}")
        return None
