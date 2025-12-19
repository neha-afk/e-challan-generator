# app.py
from flask import Flask, render_template, Response, jsonify, send_from_directory
import cv2
import time
import os
import uuid
import datetime
from ultralytics import YOLO
from utils.config import VIDEO_SOURCE, PROJECT_ROOT, MODEL_PATH, VEHICLE_CLASSES

# Import the new modules we built
from speed_calculation import SpeedTracker
from violation import ViolationDetector, LANE_1_LIMIT, LANE_2_LIMIT, LANE_DIVIDER_X
from plate_generator import PlateManager
from helmet_detector import HelmetDetector
from traffic_light import TrafficLight
from red_light_detector import RedLightDetector
import database

# Define paths for frontend
TEMPLATE_DIR = os.path.join(PROJECT_ROOT, 'frontend', 'templates')
STATIC_DIR = os.path.join(PROJECT_ROOT, 'frontend', 'static')

app = Flask(__name__, template_folder=TEMPLATE_DIR, static_folder=STATIC_DIR)

# Constants
VIDEO_DIR = os.path.join(PROJECT_ROOT, "videos")

def get_available_videos():
    """List all valid video files in the videos directory."""
    valid_extensions = ('.mp4', '.avi', '.mov', '.mkv')
    if not os.path.exists(VIDEO_DIR):
        print(f"Warning: Video directory not found: {VIDEO_DIR}")
        return []
    return [f for f in os.listdir(VIDEO_DIR) if f.lower().endswith(valid_extensions)]

# Global Statistics
stats = {
    "total_vehicles": 0,
    "violations": 0,
    "current_speed_avg": 0,
    "recent_violations": []
}

def generate_frames(video_file):
    video_path = os.path.join(VIDEO_DIR, video_file)
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}.")
        return

    # Initialize PER-STREAM instances to ensure isolated tracking state
    # YOLO persistence relies on the model instance (or explicit session reset, but new instance is safest)
    local_model = YOLO(MODEL_PATH)
    local_speed_tracker = SpeedTracker()
    local_violation_detector = ViolationDetector()
    local_plate_manager = PlateManager()
    local_helmet_detector = HelmetDetector()
    local_traffic_light = TrafficLight()
    local_red_light_detector = RedLightDetector(stop_line_y=500) # Defined 500 as virtual stop line
    
    # Performance State
    frame_count = 0
    SKIP_FRAMES = 3 # Run YOLO every N frames
    
    # Store previous results for skipped frames
    # Structure: [{'box': [x1, y1, x2, y2], 'id': int, 'cls': int}]
    last_detections = [] 
    
    # Downscaling metrics (Calculated once)
    TARGET_WIDTH = 640
    scale_factor = 1.0
    
    # We need a unique lane identifier for the logs
    lane_id = video_file

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # Loop video
            continue
            
        frame_count += 1
        
        # Calculate scale factor once
        height, width = frame.shape[:2]
        if scale_factor == 1.0 and width > TARGET_WIDTH:
             scale_factor = TARGET_WIDTH / width
             
        # 1. Downscale for YOLO (Performance)
        if scale_factor < 1.0:
            small_frame = cv2.resize(frame, (int(width * scale_factor), int(height * scale_factor)))
        else:
            small_frame = frame

        # 2. Track (Frame Skipping)
        current_detections = []
        
        if frame_count % SKIP_FRAMES == 0:
            # Run Heavy Detection
            results = local_model.track(small_frame, persist=True, conf=0.5, classes=VEHICLE_CLASSES, verbose=False, tracker="bytetrack.yaml")
            
            if results[0].boxes.id is not None:
                boxes = results[0].boxes.xyxy.cpu().numpy()
                track_ids = results[0].boxes.id.int().cpu().numpy()
                cls_ids = results[0].boxes.cls.int().cpu().numpy()
                
                # Rescale boxes back to original frames
                for box, track_id, cls in zip(boxes, track_ids, cls_ids):
                    # Scale back
                    if scale_factor < 1.0:
                         box = box / scale_factor
                         
                    x1, y1, x2, y2 = map(int, box)
                    
                    # Run Helmet Detection (Synced with Detection Frame)
                    # Throttle: Run every 2nd detection cycle (approx every 6 frames if SKIP=3)
                    # We store the result to reuse it for skipped frames too
                    h_status = "UNKNOWN"
                    is_h_violation = False
                    head_bbox = None
                    
                    # Logic: Only check if it's a bike
                    if int(cls) in [1, 3]:
                        # Optional: Further throttle if needed, but per-detection-frame is safest
                        h_status, is_h_violation, head_bbox = local_helmet_detector.detect(int(track_id), frame, (x1, y1, x2, y2), plate=None)
                    
                    current_detections.append({
                        'box': [x1, y1, x2, y2],
                        'id': int(track_id),
                        'cls': int(cls),
                        'helmet': (h_status, is_h_violation, head_bbox)
                    })
            
            last_detections = current_detections
        else:
            # Reuse previous detections
            current_detections = last_detections
            
        annotated_frame = frame.copy()
        
        # Draw Lane Info and Traffic Light Elements
        cv2.line(annotated_frame, (LANE_DIVIDER_X, 0), (LANE_DIVIDER_X, 720), (255, 255, 0), 2)
        cv2.putText(annotated_frame, f"L1 ({LANE_1_LIMIT})", (100, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
        cv2.putText(annotated_frame, f"L2 ({LANE_2_LIMIT})", (740, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
        cv2.putText(annotated_frame, f"Cam: {lane_id}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        # Draw Traffic Light
        annotated_frame = local_traffic_light.draw(annotated_frame)
        local_red_light_detector.draw_overlay(annotated_frame)
        current_light_state = local_traffic_light.get_state()

        current_speeds_frame = []

        for det in current_detections:
            x1, y1, x2, y2 = det['box']
            track_id = det['id']
            cls = det['cls']
            
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
                
            # 0. Get/Assign Number Plate (Run Detection/Localization)
            plate, plate_bbox = local_plate_manager.detect_and_assign(track_id, frame, (x1, y1, x2, y2))
            
            # 1. Calculate Speed
            # Only update speed if we are processing a new frame set (not reused)
            if frame_count % SKIP_FRAMES == 0:
                 # Time elapsed = SKIP_FRAMES * (1/FPS)
                 # Assuming 30 FPS fixed in tracker default
                 dt = SKIP_FRAMES * (1.0 / 30.0) 
                 speed = local_speed_tracker.calculate_speed(track_id, (cx, cy), time_elapsed=dt)
            else:
                 # Reuse last known speed for visualization on skipped frames
                 speed = local_speed_tracker.get_last_speed(track_id)
            
            if speed > 2: # Filter static noise
                current_speeds_frame.append(speed)
            
            # 2. Check Speed Violation
            is_violation, lane_name, limit = local_violation_detector.check_violation(track_id, speed, (cx, cy), frame, (x1, y1, x2, y2), plate=plate)
            
            # 2.5 Check Helmet Violation (Motorcycles only)
            # Retrieved from synchronized detection loop
            helmet_status, is_helmet_violation, head_bbox = det.get('helmet', ("UNKNOWN", False, None))

            # 2.6 Check Red Light Violation
            # Check for all vehicle types
            rl_status, is_rl_violation = local_red_light_detector.detect(track_id, (x1, y1, x2, y2), current_light_state)

            # 3. Visualize
            color = (0, 255, 0)
            status = "OK"
            
            # Helper to draw head box
            if head_bbox:
                hx1, hy1, hx2, hy2 = head_bbox
                if helmet_status == "HELMET":
                     cv2.rectangle(annotated_frame, (hx1, hy1), (hx2, hy2), (0, 255, 0), 2)
                     cv2.putText(annotated_frame, "HELMET DETECTED", (hx1, hy1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                elif helmet_status == "NO_HELMET":
                     cv2.rectangle(annotated_frame, (hx1, hy1), (hx2, hy2), (0, 0, 255), 2)
                     cv2.putText(annotated_frame, "NO HELMET", (hx1, hy1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

            
            # Priority: Red Light > Speed > Helmet
            if is_rl_violation or (track_id in local_red_light_detector.violated_vehicles):
                color = (0, 0, 255)
                status = "RED LIGHT"
            elif is_violation or track_id in local_violation_detector.violated_vehicles:
                color = (0, 0, 255)
                status = "OVERSPEED"
            elif is_helmet_violation or (int(cls) in [1, 3] and track_id in local_helmet_detector.violated_vehicles):
                 color = (0, 0, 255)
                 status = "NO HELMET"
            elif int(cls) in [1, 3] and helmet_status == "SAFE":
                 color = (0, 255, 0)
            
            # --- Handle New Violations (Logging) ---
            
            # Helper to log
            def log_violation(v_type, speed_val):
                stats["violations"] += 1
                # Capture Snapshot
                from snapshot import capture_snapshot
                from challan import generate_challan
                
                snapshot_path = capture_snapshot(frame, track_id, speed_val, (x1,y1,x2,y2))
                
                # Generate Challan
                c_data = {
                    'id': str(track_id),
                    'plate': plate if plate else f"ID-{track_id}",
                    'timestamp': datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'speed': round(speed_val, 1),
                    'limit': 0, # N/A for red light/helmet
                    'lane': lane_id,
                    'violation_type': v_type,
                    'snapshot_path': snapshot_path,
                    'challan_path': f"challans/Challan_{track_id}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                }
                if v_type == "Overspeed": c_data['limit'] = limit # Special case
                
                c_path = generate_challan(c_data)
                c_data['challan_path'] = c_path
                database.save_violation(c_data)
                
                # Add to recent stats
                new_log = {
                    "time": datetime.datetime.now().strftime("%H:%M:%S"),
                    "id": f"{c_data['plate']}",
                    "speed": round(speed_val, 1),
                    "lane": f"{lane_id} ({v_type})"
                }
                if not any(v['id'] == new_log['id'] and v['lane'] == new_log['lane'] for v in stats["recent_violations"]):
                     stats["recent_violations"].insert(0, new_log)
                     if len(stats["recent_violations"]) > 10:
                        stats["recent_violations"].pop()

            if is_rl_violation:
                log_violation("Red Light", speed)
                
            if is_helmet_violation:
                stats["violations"] += 1
                new_log = {
                    "time": datetime.datetime.now().strftime("%H:%M:%S"),
                    "id": f"{plate if plate else track_id}",
                    "speed": round(speed, 1),
                    "lane": f"{lane_id} (No Helmet)" 
                }
                if not any(v['id'] == new_log['id'] and v['lane'] == new_log['lane'] for v in stats["recent_violations"]):
                     stats["recent_violations"].insert(0, new_log)
                     if len(stats["recent_violations"]) > 10:
                        stats["recent_violations"].pop()
            
            if is_violation:
                stats["violations"] += 1
                new_log = {
                    "time": datetime.datetime.now().strftime("%H:%M:%S"),
                    "id": f"{plate}", 
                    "speed": round(speed, 1),
                    "lane": f"{lane_id} ({lane_name})"
                }
                if not any(v['id'] == new_log['id'] for v in stats["recent_violations"]):
                    stats["recent_violations"].insert(0, new_log)
                    if len(stats["recent_violations"]) > 10:
                        stats["recent_violations"].pop()

            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
            
            # Visualize Plate Localization
            if plate_bbox:
                px1, py1, px2, py2 = plate_bbox
                cv2.rectangle(annotated_frame, (px1, py1), (px2, py2), (255, 255, 0), 2) # Cyan for plate

            # Labels
            # Status (Red/Green) above
            if status != "OK":
                 cv2.putText(annotated_frame, status, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            
            # Speed & Plate below
            label_txt = f"{plate} {speed:.1f} km/h"
            cv2.putText(annotated_frame, label_txt, (x1, y2 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

        # Update Avg Speed (Global smoothed)
        if current_speeds_frame:
            frame_avg = sum(current_speeds_frame) / len(current_speeds_frame)
            stats["current_speed_avg"] = round((stats["current_speed_avg"] * 0.9) + (frame_avg * 0.1), 1)

        # Encode
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/lanes')
def get_lanes():
    return jsonify(get_available_videos())

@app.route('/video_feed/<filename>')
def video_feed(filename):
    # Security check: ensure filename is just a name, not a path traversal
    safe_name = os.path.basename(filename)
    if safe_name not in get_available_videos():
         return "Video not found", 404
         
    return Response(generate_frames(safe_name), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/stats')
def get_stats():
    # Refresh stats from DB
    all_violations = database.get_all_violations()
    stats["violations"] = len(all_violations)
    return jsonify(stats)

@app.route('/api/violations')
def get_violations_api():
    return jsonify(database.get_all_violations())

@app.route('/download/challan/<filename>')
def download_challan(filename):
    # Securely serve the file from the challans directory
    challan_dir = os.path.join(PROJECT_ROOT, "challans")
    return send_from_directory(challan_dir, filename, as_attachment=True)

@app.route('/api/clear_history', methods=['POST'])
def clear_history():
    """Clears all system history: violations, files, stats."""
    import glob
    from utils import system_state
    
    # 1. Clear Database
    database.clear_all_data()
    
    # 2. Clear Files (Challans & Snapshots)
    # Define directories
    challan_dir = os.path.join(PROJECT_ROOT, "challans")
    snapshot_dir = os.path.join(PROJECT_ROOT, "snapshots")
    
    # Remove files safely
    for folder in [challan_dir, snapshot_dir]:
        if os.path.exists(folder):
            files = glob.glob(os.path.join(folder, "*"))
            for f in files:
                try:
                    os.remove(f)
                except Exception as e:
                    print(f"Error deleting {f}: {e}")
                    
    # 3. Reset Global Stats
    global stats
    stats = {
        "total_vehicles": 0,
        "violations": 0,
        "current_speed_avg": 0,
        "recent_violations": []
    }
    
    # 4. Signal Reset to Detectors
    system_state.set_reset_time()
    
    print("[SYSTEM] History cleared successfully.")
    return jsonify({"status": "success", "message": "History cleared"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
