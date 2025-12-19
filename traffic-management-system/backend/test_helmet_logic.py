import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import numpy as np

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock dependencies BEFORE importing helmet_detector
sys.modules['snapshot'] = MagicMock()
sys.modules['challan'] = MagicMock()
sys.modules['database'] = MagicMock()

# proper utils mock
mock_utils = MagicMock()
mock_system_state = MagicMock()
mock_system_state.get_last_reset_time.return_value = 0
mock_utils.system_state = mock_system_state
sys.modules['utils'] = mock_utils
sys.modules['utils.config'] = MagicMock()
sys.modules['ultralytics'] = MagicMock() # Mock YOLO library

from helmet_detector import HelmetDetector

class MockProbs:
    def __init__(self, top1, conf):
        self.top1 = top1
        self.top1conf = MagicMock()
        self.top1conf.item.return_value = conf
        # Simulate data tensor behavior for fallback
        self.data = MagicMock()
        self.data.__getitem__.return_value.item.return_value = conf

class MockResults:
    def __init__(self, label_name, conf):
        self.probs = MockProbs(0, conf)
        # Assuming names is a dict
        self.names = {0: label_name}
        # Plot method for safety
        self.plot = MagicMock(return_value=np.zeros((10,10,3)))

class TestHelmetDetector(unittest.TestCase):
    def setUp(self):
        # Since we mocked ultralytics, HelmetDetector init (which calls YOLO()) will get a mock
        self.detector = HelmetDetector()
        # Ensure the model attribute is our controlled mock
        self.detector.model = MagicMock()
        # IMPORTANT: The code accesses self.model.names later
        self.detector.model.names = {0: "Helmet", 1: "No Helmet"}
        
        # Override gate for tests (mock 50x50 crop area to pass area gate)
        # 100x100 frame, bbox (10,10,50,90) -> w=40, h=80
        # crop_w = 24, crop_h = 28 -> area = 672 > 400. OK.

    def test_clean_state(self):
        """Test initial state is clean"""
        self.assertEqual(len(self.detector.helmet_history), 0)

    def test_helmet_safe(self):
        """Test that helmet detection returns HELMET status"""
        print("\nTest: test_helmet_safe")
        mock_result = MockResults("Helmet", 0.95)
        self.detector.model.return_value = [mock_result]
        self.detector.model.names = {0: "Helmet"}
        
        frame = np.zeros((100, 100, 3), dtype=np.uint8)
        bbox = (10, 10, 50, 90)
        
        # 3 Frames needed for stabilization
        for _ in range(3):
            status, new_violation, _ = self.detector.detect(1, frame, bbox)
            
        self.assertEqual(status, "HELMET")
        self.assertFalse(new_violation)
        self.assertEqual(self.detector.helmet_history.get(1, 0), 0)

    def test_sustained_violation_trigger(self):
        """Test that violation triggers ONLY after 5 frames of high conf No Helmet"""
        print("\nTest: test_sustained_violation_trigger")
        frame = np.zeros((100, 100, 3), dtype=np.uint8)
        bbox = (10, 10, 50, 90)

        mock_result = MockResults("No Helmet", 0.9)
        self.detector.model.return_value = [mock_result]
        self.detector.model.names = {0: "No Helmet"}

        # Stabilization needs 3 frames to confirm "NO_HELMET"
        # Then we need 5 frames of "NO_HELMET" to trigger violation
        # Note: helmet_history increments immediately when frame is NO_HELMET (even if not stabilized? Check code)
        # CODE CHECK: 
        # final_status = stb['confirmed']
        # if final_status == "NO_HELMET": history += 1
        
        # So we need to STABILIZE to NO_HELMET first (3 frames), then count 5 frames of NO_HELMET.
        
        # Frame 1: Status=NO_HELMET, Stability Count=1, Confirmed=UNKNOWN. Final=UNKNOWN. Hist=0.
        # Frame 2: Status=NO_HELMET, Stability Count=2, Confirmed=UNKNOWN. Final=UNKNOWN. Hist=0.
        # Frame 3: Status=NO_HELMET, Stability Count=3, Confirmed=NO_HELMET. Final=NO_HELMET. Hist=1.
        
        # So it takes 3 iterations to get first Count=1.
        # Then 4 more iterations to reach Count=5.
        
        # Frame 1-2
        for i in range(2):
            status, viol, _ = self.detector.detect(101, frame, bbox)
            self.assertEqual(status, "UNKNOWN")
            self.assertEqual(self.detector.helmet_history.get(101, 0), 0)
            
        # Frame 3 (Becomes Confirmed No Helmet, History=1)
        status, viol, _ = self.detector.detect(101, frame, bbox)
        self.assertEqual(status, "NO_HELMET")
        self.assertEqual(self.detector.helmet_history[101], 1)
        
        # Frame 4-6 (History 2, 3, 4)
        for i in range(3):
            status, viol, _ = self.detector.detect(101, frame, bbox)
            self.assertEqual(self.detector.helmet_history[101], i+2)
            self.assertFalse(viol)
            
        # Frame 7 (History=5 -> Violation)
        status, new_violation, _ = self.detector.detect(101, frame, bbox)
        print(f"Frame 7: Count={self.detector.helmet_history.get(101)}, Status={status}")
        
        self.assertEqual(status, "VIOLATION")
        self.assertTrue(new_violation)
        self.assertEqual(self.detector.helmet_history[101], 5)

    def test_low_confidence_reset(self):
        """Test that low confidence PRESERVES the last confirmed status (Stabilization)"""
        print("\nTest: test_low_confidence_reset")
        frame = np.zeros((100, 100, 3), dtype=np.uint8)
        bbox = (10, 10, 50, 90)

        # 1. High conf No Helmet (Stabilize first -> 3 frames)
        self.detector.model.return_value = [MockResults("No Helmet", 0.9)]
        self.detector.model.names = {0: "No Helmet"}
        
        for _ in range(3): 
            self.detector.detect(202, frame, bbox)
            
        self.assertEqual(self.detector.helmet_history[202], 1)

        # 2. Low conf (Status -> UNKNOWN internally, but Confirmed stays NO_HELMET)
        # "treat as undecidable for that frame (no change in status)"
        # So we expect NO_HELMET output.
        
        self.detector.model.return_value = [MockResults("No Helmet", 0.5)]
        
        # Feed 3 UNKNOWN frames
        status = "UNKNOWN"
        for _ in range(3):
            status, _, _ = self.detector.detect(202, frame, bbox)
            
        # Should persist as NO_HELMET
        self.assertEqual(status, "NO_HELMET")
        # History continues to count because confirmed status is NO_HELMET
        # 1 (initial) + 3 (new frames) = 4
        self.assertEqual(self.detector.helmet_history[202], 4)

    def test_intermittent_reset(self):
        """Test that a single helmet frame resets the counter (after stabilization)"""
        print("\nTest: test_intermittent_reset")
        frame = np.zeros((100, 100, 3), dtype=np.uint8)
        bbox = (10, 10, 50, 90)

        # 3 High conf frames (Confirm No Helmet)
        self.detector.model.return_value = [MockResults("No Helmet", 0.9)]
        self.detector.model.names = {0: "No Helmet"}
        for _ in range(3): self.detector.detect(303, frame, bbox)
        
        self.assertEqual(self.detector.helmet_history[303], 1)

        # Switch to Helmet (Needs 3 frames to flip status)
        self.detector.model.return_value = [MockResults("Helmet", 0.9)]
        self.detector.model.names = {0: "Helmet"}
        
        # Frame 1 (Status=HELMET, but Confirmed stays NO_HELMET!) -> History 2
        status, _, _ = self.detector.detect(303, frame, bbox)
        self.assertEqual(status, "NO_HELMET") 
        self.assertEqual(self.detector.helmet_history[303], 2)
        
        # Frame 2 -> History 3
        self.detector.detect(303, frame, bbox)
        
        # Frame 3 -> Confirmed becomes HELMET -> History resets to 0
        status, _, _ = self.detector.detect(303, frame, bbox)
        
        print(f"Helmet Frame 3: Count={self.detector.helmet_history.get(303)}")
        self.assertEqual(status, "HELMET")
        self.assertEqual(self.detector.helmet_history[303], 0)

if __name__ == '__main__':
    unittest.main()
