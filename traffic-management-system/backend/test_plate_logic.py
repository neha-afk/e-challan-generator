import unittest
import os
import shutil
import cv2
import numpy as np
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from plate_generator import PlateManager, PLATE_DIR

class TestPlateManager(unittest.TestCase):
    def setUp(self):
        # Ensure clean state
        if os.path.exists(PLATE_DIR):
            shutil.rmtree(PLATE_DIR)
        self.manager = PlateManager()

    def tearDown(self):
        # Cleanup
        if os.path.exists(PLATE_DIR):
            shutil.rmtree(PLATE_DIR)

    def test_directory_creation(self):
        """Test that plates directory is created on init"""
        self.assertTrue(os.path.exists(PLATE_DIR))

    def test_heuristic_fallback(self):
        """Test that heuristic crop is saved and text assigned"""
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        # Create a white box to represent vehicle
        vehicle_bbox = (100, 100, 300, 400) # w=200, h=300
        
        # Call detect_and_assign
        track_id = 999
        text = self.manager.detect_and_assign(track_id, frame, vehicle_bbox)
        
        # Check text format (Simple check)
        parts = text.split('-')
        self.assertEqual(len(parts), 4) # AA-00-XX-0000
        
        # Check persistence
        text2 = self.manager.detect_and_assign(track_id, frame, vehicle_bbox)
        self.assertEqual(text, text2)

        # Check image saved
        expected_file = os.path.join(PLATE_DIR, f"plate_{track_id}.jpg")
        self.assertTrue(os.path.exists(expected_file), "Plate image should be saved")

    def test_small_bbox_fallback(self):
        """Test fallback for too small bbox (no image saved)"""
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        vehicle_bbox = (10, 10, 15, 15) # Very small
        
        track_id = 888
        text = self.manager.detect_and_assign(track_id, frame, vehicle_bbox)
        
        self.assertTrue(text)
        # Should NOT have saved an image
        expected_file = os.path.join(PLATE_DIR, f"plate_{track_id}.jpg")
        self.assertFalse(os.path.exists(expected_file))

if __name__ == '__main__':
    unittest.main()
