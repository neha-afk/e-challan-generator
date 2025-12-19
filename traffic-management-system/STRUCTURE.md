# Project Structure

This document explains the organization of the Intelligent Traffic Management System.

## Directory Breakdown

### `backend/`
Contains all the server-side logic and Python code.
- **`app.py`**: The entry point for the Flask application.
- **`core/`**: Core modules for detection, tracking, speed estimation, and challan generation.
- **`utils/`**: Configuration and utility scripts.

### `frontend/`
Contains the user interface code.
- **`templates/`**: HTML files (Dashboard, layouts).
- **`static/`**: CSS, JavaScript, images, and fonts.

### `models/`
Stores the Machine Learning models.
- **`yolov8n.pt`**: The YOLOv8 model weights file used for vehicle detection.

### `videos/`
Stores input video files for processing.
- **`traffic_video.mp4`**: Sample footage used for testing and demonstration.

### `challans/`
Output directory for generated E-Challans.
- Stores the PDF files generated for traffic violations.

### `snapshots/`
Output directory for violation snapshots.
- Stores images captured when a vehicle exceeds the speed limit.

## Running the Project
Since the structure has changed, you need to run the app from the `backend` directory (or update python path):

```bash
cd backend
python app.py
```
