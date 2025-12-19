import cv2
import os
from ultralytics import YOLO
from utils.config import PROJECT_ROOT, MODEL_PATH, VIDEO_SOURCE, VEHICLE_CLASSES

def main():
    # 1. Load the Model
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model not found at {MODEL_PATH}")
        return
        
    print(f"Loading YOLOv8 model from: {MODEL_PATH}")
    model = YOLO(MODEL_PATH)

    # 2. Open Video Source
    video_path = VIDEO_SOURCE
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"Error: Could not open video file: {video_path}")
        return

    print(f"Tracking on video: {video_path}...")
    print("Press 'q' to exit.")

    # 3. Processing Loop
    while True:
        success, frame = cap.read()
        if not success:
            print("End of video or error reading frame.")
            break

        # 4. Run Tracking
        # persist=True: Vital for tracking to maintain IDs across frames.
        # tracker="bytetrack.yaml": Ultralytics supports 'bytetrack' or 'botsort' internally.
        results = model.track(frame, persist=True, conf=0.5, classes=VEHICLE_CLASSES, verbose=False, tracker="bytetrack.yaml")

        # 5. Visualize Results with IDs
        annotated_frame = frame.copy()
        
        # Get detections
        if results[0].boxes.id is not None:
            boxes = results[0].boxes.xyxy.cpu().numpy()
            track_ids = results[0].boxes.id.int().cpu().numpy()
            cls_ids = results[0].boxes.cls.int().cpu().numpy()

            for box, track_id, cls in zip(boxes, track_ids, cls_ids):
                x1, y1, x2, y2 = map(int, box)
                
                # Draw Box
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                # Draw Label + ID
                label = f"ID: {track_id} {model.names[cls]}"
                cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        else:
            # Fallback if no tracks (just raw detection or empty)
            annotated_frame = results[0].plot()

        # 6. Show Real-time Output
        cv2.imshow("YOLOv8 Vehicle Tracking", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
