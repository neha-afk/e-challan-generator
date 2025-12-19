
import time
import cv2

class TrafficLight:
    def __init__(self, cycle_start_offset=0):
        # Configuration (seconds)
        self.GREEN_DURATION = 10
        self.YELLOW_DURATION = 3
        self.RED_DURATION = 10
        self.TOTAL_CYCLE = self.GREEN_DURATION + self.YELLOW_DURATION + self.RED_DURATION
        
        # Offset allows different cameras to be desynchronized if needed
        self.offset = cycle_start_offset

    def get_state(self):
        """
        Returns the current state: 'GREEN', 'YELLOW', 'RED'
        """
        # Time integration to ensure synchronization
        current_time = time.time() + self.offset
        cycle_time = current_time % self.TOTAL_CYCLE
        
        if cycle_time < self.GREEN_DURATION:
            return "GREEN"
        elif cycle_time < (self.GREEN_DURATION + self.YELLOW_DURATION):
            return "YELLOW"
        else:
            return "RED"

    def draw(self, frame):
        """
        Draws the traffic light indicator on the frame.
        """
        state = self.get_state()
        
        # Overlay settings
        overlay_x = 50
        overlay_y = 150
        width = 60
        height = 140
        padding = 10
        
        # Draw Background Box
        # Using pure simple drawing
        # Top-Left corner (frame is numpy array)
        x1, y1 = frame.shape[1] - 100, 50 # Top Right
        x2, y2 = x1 + width, y1 + height
        
        # Background
        cv2.rectangle(frame, (x1, y1), (x2, y2), (40, 40, 40), -1)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (200, 200, 200), 2) # Border
        
        # Light Colors
        off_color = (60, 60, 60)
        
        r_color = (0, 0, 255) if state == "RED" else off_color
        y_color = (0, 255, 255) if state == "YELLOW" else off_color
        g_color = (0, 255, 0) if state == "GREEN" else off_color
        
        # Circle Centers
        cx = x1 + width // 2
        cy_r = y1 + 30
        cy_y = y1 + 70
        cy_g = y1 + 110
        radius = 15
        
        # Draw Lights
        cv2.circle(frame, (cx, cy_r), radius, r_color, -1)
        cv2.circle(frame, (cx, cy_y), radius, y_color, -1)
        cv2.circle(frame, (cx, cy_g), radius, g_color, -1)
        
        return frame
