
import unittest
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from red_light_detector import RedLightDetector

class TestRedLightLogic(unittest.TestCase):
    def setUp(self):
        self.detector = RedLightDetector(stop_line_y=500)
    
    def test_crossing_on_red(self):
        print("\nTest: Crossing on RED")
        # Vehicle moves from 400 to 520 (crosses 500)
        track_id = 1
        bbox_before = (100, 350, 200, 450) # Cy = 400
        bbox_after = (100, 470, 200, 570) # Cy = 520
        
        # Frame 1: Before line
        status, is_new = self.detector.detect(track_id, bbox_before, "RED")
        self.assertEqual(status, "SAFE")
        
        # Frame 2: Crossing line
        status, is_new = self.detector.detect(track_id, bbox_after, "RED")
        self.assertEqual(status, "VIOLATION")
        self.assertTrue(is_new)
        
    def test_crossing_on_green(self):
        print("\nTest: Crossing on GREEN")
        track_id = 2
        bbox_before = (100, 350, 200, 450) # Cy = 400
        bbox_after = (100, 470, 200, 570) # Cy = 520
        
        # Frame 1
        self.detector.detect(track_id, bbox_before, "GREEN")
        # Frame 2
        status, is_new = self.detector.detect(track_id, bbox_after, "GREEN")
        
        self.assertEqual(status, "SAFE") # Should be safe on Green
        self.assertFalse(is_new)
        
    def test_duplicate_violation(self):
        print("\nTest: Duplicate Violation Check")
        track_id = 3
        bbox_before = (100, 350, 200, 450)
        bbox_after = (100, 470, 200, 570)
        
        # Trigger first time
        self.detector.detect(track_id, bbox_before, "RED")
        self.detector.detect(track_id, bbox_after, "RED")
        
        # Trigger second time (next frame, still past line)
        bbox_further = (100, 500, 200, 600)
        status, is_new = self.detector.detect(track_id, bbox_further, "RED")
        
        self.assertEqual(status, "VIOLATION") # Still marked as violation
        self.assertFalse(is_new) # But NOT new

if __name__ == '__main__':
    unittest.main()
