import unittest
import sys
import os
import math
from collections import deque, defaultdict
from unittest.mock import MagicMock

# Path adjustment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock utils.config BEFORE importing speed_calculation
mock_config = MagicMock()
mock_config.PROJECT_ROOT = "mock_root"
mock_config.MODEL_PATH = "mock_model.pt"
mock_config.VIDEO_SOURCE = "mock_video.mp4"
mock_config.VEHICLE_CLASSES = [2, 3, 5, 7]
sys.modules['utils.config'] = mock_config
sys.modules['ultralytics'] = MagicMock()

from speed_calculation import SpeedTracker

class TestSpeedTracker(unittest.TestCase):
    def setUp(self):
        self.tracker = SpeedTracker(meters_per_pixel=0.05, fps=30)
        # meters_per_pixel = 0.05. 30 fps.
        # 1 pixel movement = 0.05 meters.
        # speed = 0.05 * 30 = 1.5 m/s = 5.4 km/h per pixel per frame avg? No.
        # Speed = dist / time. Dist = 1*0.05. Time = 1/30. 
        # Speed m/s = 0.05 / (1/30) = 1.5 m/s.
        # Speed km/h = 1.5 * 3.6 = 5.4 km/h per pixel.
    
    def test_minimum_track_age(self):
        """Test that speed is 0 for first 9 frames"""
        track_id = 1
        
        # Move 10 pixels every frame (Speed ~ 54 km/h)
        for i in range(15):
             cx = i * 10
             cy = 0
             speed = self.tracker.calculate_speed(track_id, (cx, cy))
             
             if i < 10: # 0 to 9 (10 frames) -> Actually track_age becomes 1 on first call.
                 # Logic: increment age first. 
                 # i=0 -> age=1.
                 # i=9 -> age=10.
                 # if age < 10: speed=0. So age 1..9 returns 0. Age 10 returns speed.
                 if self.tracker.track_ages[track_id] < 10:
                     self.assertEqual(speed, 0, f"Frame {i}: Speed should be 0 for new track")
                 else:
                     self.assertGreater(speed, 0, f"Frame {i}: Speed should be > 0 now")
                     
    def test_low_speed_clamp(self):
        """Test ignoring very low speeds < 1 km/h"""
        track_id = 2
        # Force age > 10
        self.tracker.track_ages[track_id] = 20
        self.tracker.previous_positions[track_id] = (0, 0)
        
        # Move very little: 0.1 pixel. 
        # Dist = 0.005m. Time=1/30. Speed = 0.15 m/s = 0.54 km/h.
        speed = self.tracker.calculate_speed(track_id, (0.1, 0))
        self.assertEqual(speed, 0)

    def test_high_speed_sanity(self):
        """Test ignoring speed > 150 km/h"""
        track_id = 3
        self.tracker.track_ages[track_id] = 20
        self.tracker.previous_positions[track_id] = (0, 0)
        
        # Teleport 1000 pixels. 
        # Dist = 50m. Time=1/30. Speed=1500 m/s = huge.
        speed = self.tracker.calculate_speed(track_id, (1000, 0))
        
        # Should return 0 (default last valid) or capped? 
        # Code says: if speed > 150: speed = last_valid.get(0). So 0.
        # But wait, smoothing logic appends this 0.
        self.assertEqual(speed, 0)

if __name__ == '__main__':
    unittest.main()
