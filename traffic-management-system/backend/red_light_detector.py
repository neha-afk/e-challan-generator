
import cv2
import time

class RedLightDetector:
    def __init__(self, stop_line_y=500):
        # Configuration
        self.stop_line_y = stop_line_y # Default stop line y-coordinate
        self.violated_vehicles = set() # Store confirmed violation IDs
        self.vehicle_states = {} # Track vehicle positions {id: previous_y}
        
    def detect(self, track_id, bbox, light_state):
        """
        Checks if the vehicle crosses the stop line during a RED light.
        Returns:
            status: "SAFE", "VIOLATION"
            is_new: True if this is a newly confirmed violation
        """
        # 1. Reset check (handled by external system_state or manual clear if needed)
        # But for strictly Red Light, we just track per session.
        # Check system reset using the same pattern if improved later.
        
        if track_id in self.violated_vehicles:
            return "VIOLATION", False

        x1, y1, x2, y2 = bbox
        
        # Calculate Centroid Y
        cy = (y1 + y2) // 2
        
        # Get previous state
        prev_y = self.vehicle_states.get(track_id)
        
        # Update state
        self.vehicle_states[track_id] = cy
        
        if prev_y is None:
            return "SAFE", False
            
        # Crossing Logic:
        # Assuming camera view where Y increases downwards (Top=0, Bottom=720)
        # Vehicle moving DOWN (away?) or UP (towards?)
        # Let's assume standard CCTV: Moving DOWN crossing line y=500.
        # "Crossed" means: prev_y < LINE and curr_y >= LINE
        
        has_crossed = (prev_y < self.stop_line_y) and (cy >= self.stop_line_y)
        
        if has_crossed and light_state == "RED":
            self.violated_vehicles.add(track_id)
            print(f"[RED LIGHT] Vehicle {track_id} crossed Stop Line during RED!")
            return "VIOLATION", True
            
        return "SAFE", False
        
    def draw_overlay(self, frame):
        """Draws the virtual stop line."""
        h, w = frame.shape[:2]
        cv2.line(frame, (0, self.stop_line_y), (w, self.stop_line_y), (0, 0, 255), 2)
        cv2.putText(frame, "STOP LINE", (10, self.stop_line_y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
