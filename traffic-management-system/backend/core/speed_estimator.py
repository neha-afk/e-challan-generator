# core/speed_estimator.py
import cv2
import numpy as np
from collections import defaultdict

class SpeedEstimator:
    def __init__(self, source_points, real_width, real_height):
        """
        source_points: list of 4 (x, y) tuples in the image
        real_width: width of the road area in meters
        real_height: length of the road area in meters
        """
        self.source_points = np.array(source_points, dtype=np.float32)
        self.real_width = real_width  # meters
        self.real_height = real_height # meters
        
        # Destination points (Bird's eye view coordinates)
        # We assume top-left is (0,0) and bottom-right is (real_width, real_height) scale factor
        # To keep precision, we can use a scaling factor, e.g., 1 meter = 30 pixels in the transform
        self.scale = 30 
        self.dest_points = np.array([
            [0, 0],
            [self.real_width * self.scale, 0],
            [self.real_width * self.scale, self.real_height * self.scale],
            [0, self.real_height * self.scale]
        ], dtype=np.float32)

        self.matrix = cv2.getPerspectiveTransform(self.source_points, self.dest_points)
        
        self.previous_positions = {}  # {track_id: (transformed_x, transformed_y, timestamp)}
        self.vehicle_speeds = {}      # {track_id: speed_kmh}

    def transform_point(self, point):
        """Transforms a point (x, y) using the perspective matrix."""
        p = np.array([[[point[0], point[1]]]], dtype=np.float32)
        transformed = cv2.perspectiveTransform(p, self.matrix)[0][0]
        return transformed

    def estimate_speed(self, tracks, fps=30):
        """
        tracks: list of (track_id, x1, y1, x2, y2, cls) from detector
        fps: frames per second of the video
        """
        current_speeds = {}
        
        for track in tracks:
            track_id, x1, y1, x2, y2, cls = track
            
            # Use bottom center point of the bounding box for speed
            cx = (x1 + x2) // 2
            cy = y2
            
            transformed_pos = self.transform_point((cx, cy))
            
            if track_id in self.previous_positions:
                prev_x, prev_y, _ = self.previous_positions[track_id]
                curr_x, curr_y = transformed_pos

                # Distance in transformed space (pixels scaled)
                distance_pixels = np.sqrt((curr_x - prev_x)**2 + (curr_y - prev_y)**2)
                
                # Convert back to meters (divide by scale)
                distance_meters = distance_pixels / self.scale
                
                # Speed = distance / time
                # time per frame = 1/fps
                speed_mps = distance_meters * fps
                speed_kmh = speed_mps * 3.6
                
                # Smoothing (Simple Moving Average or similar can be added)
                # For now, we take current instantaneous speed but could average it
                self.vehicle_speeds[track_id] = speed_kmh
                current_speeds[track_id] = speed_kmh
            
            # Update position
            self.previous_positions[track_id] = (transformed_pos[0], transformed_pos[1], 0) # timestamp unused for simple fps logic

        return current_speeds

    def draw_projected_roi(self, frame):
        """Draws the region of interest polygon on the frame for debugging."""
        pts = self.source_points.reshape((-1, 1, 2)).astype(np.int32)
        cv2.polylines(frame, [pts], True, (0, 255, 255), 2)
