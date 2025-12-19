from speed_calculation import SpeedTracker

def test_speed_calculation():
    # Setup
    # 0.01 m/pixel, 30 FPS
    tracker = SpeedTracker(meters_per_pixel=0.01, fps=30)
    
    track_id = 1
    
    # 1. Initial position (no speed)
    p1 = (100, 100)
    s1 = tracker.calculate_speed(track_id, p1)
    print(f"Frame 1: Pos {p1}, Speed {s1} km/h (Expected: 0)")
    
    # 2. Move 10 pixels in 1 frame (1/30 sec)
    # Distance = 10 px * 0.01 m/px = 0.1 meters
    # Time = 1/30 sec
    # Speed (m/s) = 0.1 / (1/30) = 3 m/s
    # Speed (km/h) = 3 * 3.6 = 10.8 km/h
    p2 = (110, 100)
    s2 = tracker.calculate_speed(track_id, p2)
    print(f"Frame 2: Pos {p2}, Speed {s2:.2f} km/h (Expected: ~10.8)")
    
    # 3. Move 20 pixels in 1 frame (Double speed)
    # Distance = 0.2 meters
    # Speed (m/s) = 0.2 / (1/30) = 6 m/s
    # Speed (km/h) = 6 * 3.6 = 21.6 km/h
    # BUT clamp is 12 km/h
    p3 = (130, 100)
    s3 = tracker.calculate_speed(track_id, p3)
    print(f"Frame 3: Pos {p3}, Speed Raw ~21.6, Output {s3:.2f} km/h (Expected: 12.0 CLAMPED)")
    
    # Check max clamp logic specifically
    print(f"Clamp verified: {s3 <= 12}")

if __name__ == "__main__":
    try:
        test_speed_calculation()
        print("Test Completed Successfully")
    except Exception as e:
        print(f"Test Failed: {e}")
