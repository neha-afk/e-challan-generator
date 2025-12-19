import random
import string
import os
import cv2
import numpy as np
from ultralytics import YOLO
from utils.config import PROJECT_ROOT

# Define Plate Output Directory
PLATE_DIR = os.path.join(PROJECT_ROOT, "plates")

class PlateManager:
    def __init__(self):
        self.assigned_plates = {} # {id: "KA-05-XY-1234"}
        self.plate_data = {} # {id: {'text': ..., 'image_path': ...}}
        self.state_codes = ["KA", "TN", "MH", "DL", "TS", "AP", "KL"]
        self.rto_codes = [f"{i:02}" for i in range(1, 100)] # 01-99
        
        # Try to load model, otherwise flag for fallback
        self.model = None
        self.model_path = os.path.join(PROJECT_ROOT, "models", "license_plate.pt")
        if os.path.exists(self.model_path):
            print(f"Loading Plate Detector from: {self.model_path}")
            try:
                # Attempt to load custom model. If it's incompatible with new ultralytics, 
                # we catch the error and fallback to heuristic.
                self.model = YOLO(self.model_path)
            except Exception as e:
                print(f"WARNING: Customized Plate Model failed to load ({e}). Using Heuristic Fallback.")
                self.model = None
        else:
            print("Plate Detector model not found. Using Heuristic Fallback.")

        if not os.path.exists(PLATE_DIR):
            os.makedirs(PLATE_DIR)

    def generate_plate_text(self):
        state = random.choice(self.state_codes)
        rto = random.choice(self.rto_codes)
        letters = "".join(random.choices(string.ascii_uppercase, k=2))
        numbers = f"{random.randint(1, 9999):04}"
        return f"{state}-{rto}-{letters}-{numbers}"

    def get_plate(self, track_id):
        """Legacy access, returns just text."""
        if track_id in self.plate_data:
            return self.plate_data[track_id]['text']
        # Fallback if accessed before detection (shouldn't happen with new flow)
        return self._assign_new_plate(track_id)

    def _assign_new_plate(self, track_id, image_path=None, bbox=None):
        text = self.generate_plate_text()
        self.plate_data[track_id] = {
            'text': text,
            'image_path': image_path,
            'last_bbox': bbox
        }
        self.assigned_plates[track_id] = text
        return text

    def detect_and_assign(self, track_id, frame, vehicle_bbox):
        """
        Runs detection/localization.
        Returns: (plate_text, plate_bbox)
        - plate_text: The assigned ID (simulated).
        - plate_bbox: (x1, y1, x2, y2) of the plate region for visualization.
        """
        track_id = str(track_id)
        
        # --- Opt: Return early if already detected ---
        # If we already have a plate assigned, return text and the LAST KNOWN relative offset?
        # Actually simplest is: If we have a stored relative position?
        # For now, let's just re-use the stored absolute bbox if we want it to stick (but it won't move with car)
        # BETTER: The user probably wants to see the box TRACKING the plate.
        # If we skip model inference, we can't update the plate box location accurately!
        # COMPROMISE: We perform heuristic estimation if model is skipped?
        # OR: We just accept that the plate box only updates sometimes?
        # User said "detection not working" => they want to see the box.
        
        # Let's revert the "skip inference" for now OR make it smarter.
        # If we want to save CPU, we can run plate detection every N frames too.
        # But for now, let's just make sure it WORKS.
        # Best approach: Return None for bbox (as I did), BUT app.py should handle it?
        # No, app.py draws only if plate_bbox is set.
        
        # Let's REMOVE the optimization that skips detection for now to verify functionality.
        # Once it works, we can re-add it with a 'frame_skip' logic inside here too.
        
        # Reverting the "return early" block to ensure we always try to get a bbox.
        
        x1, y1, x2, y2 = vehicle_bbox
        
        # --- Localization Logic (Run only if new) ---
        plate_bbox = None
        
        if self.model:
            # 1. Model Based Detection
            # Crop Vehicle
            if (y2 - y1) > 10 and (x2 - x1) > 10:
                vcrop = frame[y1:y2, x1:x2]
                try:
                    results = self.model(vcrop, verbose=False)
                    if results[0].boxes.xyxy.numel() > 0:
                        # Get best box (highest confidence)
                        # boxes are relative to vcrop
                        
                        # Find box with max confidence
                        best_box_idx = results[0].boxes.conf.argmax()
                        bx1, by1, bx2, by2 = results[0].boxes.xyxy[best_box_idx].cpu().numpy().astype(int)
                        
                        # Map to global frame
                        plate_bbox = (x1 + bx1, y1 + by1, x1 + bx2, y1 + by2)
                    else:
                        # Debug: Model ran but found nothing
                        # print(f"[PLATE DEBUG] ID:{track_id} - Model found 0 boxes")
                        pass
                except Exception as e:
                    print(f"Plate Model Inference Error: {e}")
            
        # 2. Heuristic Fallback (If model unavailable OR model returned no box)
        if plate_bbox is None:
            # Bottom 25% of vehicle, centered width 80%
            vh = y2 - y1
            vw = x2 - x1
            
            if vh >= 10 and vw >= 10:
                # Bottom 25%
                ph = int(vh * 0.25)
                py1 = y2 - ph
                py2 = y2
                
                # Center 80% width
                pw = int(vw * 0.8)
                pcx = x1 + vw // 2
                px1 = max(x1, pcx - pw // 2)
                px2 = min(x2, pcx + pw // 2)
                
                # Clamp
                py1 = max(0, py1)
                py2 = min(frame.shape[0], py2)
                px1 = max(0, px1)
                px2 = min(frame.shape[1], px2)
                
                plate_bbox = (px1, py1, px2, py2)
            else:
                 print(f"[PLATE DEBUG] Heuristic Failed: vh={vh}, vw={vw} too small")
                
        # Debug why bbox is bad
        if plate_bbox is None:
             print(f"[PLATE WARN] ID:{track_id} - No Plate Box Generated (Model={self.model is not None})")

        # --- Assignment Logic (Run ONCE) ---
        if track_id in self.plate_data:
            return self.plate_data[track_id]['text'], plate_bbox

        # If new:
        # Save Crop (using the calculated bbox)
        image_path = None
        if plate_bbox is not None:
            px1, py1, px2, py2 = plate_bbox
            if (px2 - px1) > 5 and (py2 - py1) > 5:
                plate_crop = frame[py1:py2, px1:px2]
                filename = f"plate_{track_id}.jpg"
                image_path = os.path.join(PLATE_DIR, filename)
                try:
                    cv2.imwrite(image_path, plate_crop)
                except Exception as e:
                    print(f"Error saving plate crop: {e}")

        # Assign Simulated ID
        text = self._assign_new_plate(track_id, image_path)
        return text, plate_bbox
