import cv2
import os
import time
import numpy as np
from ultralytics import YOLO
from utils.config import PROJECT_ROOT
from snapshot import capture_snapshot
from challan import generate_challan
from database import save_violation
import datetime

# Load model path
HELMET_MODEL_PATH = os.path.join(PROJECT_ROOT, "models", "helmet_classifier.pt")

class HelmetDetector:
    def __init__(self):
        print(f"Loading Helmet Classifier from: {HELMET_MODEL_PATH}")
        self.model = YOLO(HELMET_MODEL_PATH)
        
        # Tracking State
        self.violated_vehicles = set() # Set of track_ids that have already been fined
        self.helmet_history = {}       # {track_id: no_helmet_frame_count}
        
        # Configuration
        self.FRAMES_THRESHOLD = 5 # Require 5 consecutive frames of "No Helmet"
        
        # System Reset Logic
        self.last_check_time = time.time()

    def detect(self, track_id, frame, bbox, plate=None):
        """
        Main detection entry point.
        Returns:
            status (str): "SAFE", "VIOLATION", "UNKNOWN"
            is_new_violation (bool): True if this specific call triggered a new violation
        """
        # 1. System Reset Check
        # 1. System Reset Check
        from utils import system_state
        if self.last_check_time < system_state.get_last_reset_time():
            self.violated_vehicles.clear()
            self.helmet_history.clear()
            # New: Stabilization state {track_id: {'status': 'UNKNOWN', 'count': 0, 'confirmed': 'UNKNOWN'}}
            self.helmet_stability = {} 
            self.last_check_time = time.time()

        # Init stabilization state for new id
        if not hasattr(self, 'helmet_stability'):
             self.helmet_stability = {}
        if track_id not in self.helmet_stability:
             self.helmet_stability[track_id] = {'status': 'UNKNOWN', 'count': 0, 'confirmed': 'UNKNOWN'}

        # 2. Check if already violated (One challan per vehicle rule)
        if track_id in self.violated_vehicles:
            return "VIOLATION", False, None

        # 3. ROI Extraction & Visibility Gate
        x1, y1, x2, y2 = bbox
        
        # GATE 1: Head ROI Area Calculation
        # Top 35%
        crop_h = int((y2 - y1) * 0.35)
        # Reduce width (Side 20% each -> Center 60%)
        w = x2 - x1
        crop_w = int(w * 0.6)
        
        # Calculate ROI area *before* clamping logic to check basic size
        # Approximated area check
        roi_area = crop_h * crop_w
        
        # Threshold: Lowered to 100 (10x10) to ensure we catch even small riders
        if roi_area < 100:
             return self.helmet_stability[track_id]['confirmed'], False, None

        # Build Coordinates
        center_x = x1 + w // 2
        head_x1 = max(x1, center_x - crop_w // 2)
        head_x2 = min(x2, center_x + crop_w // 2)
        head_y1 = y1
        head_y2 = min(y2, y1 + crop_h)
        
        # Validate dimensions
        if (head_y2 - head_y1) < 5 or (head_x2 - head_x1) < 5:
             return self.helmet_stability[track_id]['confirmed'], False, None

        crop = frame[head_y1:head_y2, head_x1:head_x2]

        # 4. Preprocessing
        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        
        # 5. Classification
        results = self.model(crop_rgb, verbose=False)
        probs = results[0].probs
        
        top1_idx = probs.top1
        conf = probs.top1conf.item()
        label = results[0].names[top1_idx]
        label_str = str(label).lower()
        
        is_val_helmet_class = False
        if "no" in label_str or "without" in label_str:
            is_val_helmet_class = False
        else:
             is_val_helmet_class = True # "helmet", "rider_helmet"

        # 6. Apply Rules (Confidence Gate)
        current_frame_status = "UNKNOWN"
        
        # Debug Print to understand why detection is failing
        # print(f"[DEBUG] ID:{track_id} | Cls:{label_str} | Conf:{conf:.2f} | Area:{roi_area}")
        
        # Policy: Innocent until Proven Guilty (Always Show Status)
        # If model is 75% sure it's NO HELMET -> Red
        # Otherwise -> Green (Assume Helmet / False Alarm)
        
        # Policy: Adaptive Thresholding
        # 1. For large, clear images (Closeups), we trust the model more -> Lower Threshold (0.60)
        # 2. For distant/blurry images, we are conservative -> High Threshold (0.85) to avoid FPs
        
        limit_conf = 0.85
        if roi_area > 35000:
             limit_conf = 0.60
             
        if (not is_val_helmet_class) and conf >= limit_conf:
             current_frame_status = "NO_HELMET"
        else:
             current_frame_status = "HELMET"
             
        # 7. Temporal Stabilization
        stb = self.helmet_stability[track_id]
        
        if current_frame_status != "UNKNOWN":
            if current_frame_status == stb['status']:
                stb['count'] += 1
            else:
                stb['status'] = current_frame_status
                stb['count'] = 1
                
            # Instant lock for first detection, otherwise wait for 3 frames
            if stb['confirmed'] == 'UNKNOWN':
                 stb['confirmed'] = current_frame_status
            elif stb['count'] >= 3:
                stb['confirmed'] = current_frame_status
        else:
             stb['count'] = 0 
        
        final_status = stb['confirmed']
        
        # 8. Check Violation
        if final_status == "NO_HELMET":
             self.helmet_history[track_id] = self.helmet_history.get(track_id, 0) + 1
        else:
             self.helmet_history[track_id] = 0

        if final_status == "NO_HELMET" and self.helmet_history[track_id] >= self.FRAMES_THRESHOLD:
             self.violated_vehicles.add(track_id)
             print(f"[VIOLATION CONFIRMED] Helmet Violation for ID: {track_id}")
             self._handle_violation(track_id, frame, bbox, plate)
             return "VIOLATION", True, (head_x1, head_y1, head_x2, head_y2)
             
        return final_status, False, (head_x1, head_y1, head_x2, head_y2)


    def _handle_violation(self, track_id, frame, bbox, plate):
        """Generates snapshot, challan, and DB entry."""
        plate_str = plate if plate else f"ID-{track_id}"
        
        # Speed 0 placeholder
        snapshot_path = capture_snapshot(frame, track_id, 0, bbox)
        
        if snapshot_path:
            data = {
                'id': str(track_id),
                'plate': plate_str,
                'timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'speed': 0, 
                'limit': 0,
                'lane': "N/A", 
                'violation_type': 'Helmet Violation',
                'snapshot_path': snapshot_path,
                'challan_path': f"challans/Challan_Helmet_{track_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            }
            
            # Generate Challan
            challan_path = generate_challan(data)
            data['challan_path'] = challan_path
            
            # Save to Database
            save_violation(data)
            print(f"[CHALLAN] Generated for Helmet Violation ID: {track_id}")
