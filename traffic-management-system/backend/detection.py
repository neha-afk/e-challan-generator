import cv2
import os
from ultralytics import YOLO
from utils.config import PROJECT_ROOT, MODEL_PATH, VIDEO_SOURCE, VEHICLE_CLASSES

def main():
    # 1. Load the Model
    # Using the Nano model for speed as per config
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

    print(f"Processing video: {video_path}...")
    print("Press 'q' to exit.")

    # 3. Processing Loop
    while True:
        success, frame = cap.read()
        if not success:
            print("End of video or error reading frame.")
            break

        # Resize for consistent performance (optional, matches config)
        # frame = cv2.resize(frame, (1280, 720))

        # 4. Run Detection
        # conf=0.5: Confidence threshold
        # classes=VEHICLE_CLASSES: Filter only for vehicles (from config)
        results = model.predict(frame, conf=0.5, classes=VEHICLE_CLASSES, verbose=False)

        # 5. Visualize Results
        # Iterate through detections to draw custom boxes if needed, 
        # or use the built-in plot() method for quick visualization.
        # Requirement: "Draw bounding boxes and class labels". 
        # model.predict returns a Results object which has a plot() method.
        
        annotated_frame = results[0].plot()

        # 6. Show Real-time Output
        cv2.imshow("YOLOv8 Vehicle Detection", annotated_frame)

        # Break loop on 'q' key press
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Cleanup
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
