
import requests
import os
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def verify_clear_history():
    print("--- Starting Clear History Verification ---")
    
    # 1. Setup: Create Dummy Data
    print("[SETUP] Creating dummy files and data...")
    os.makedirs("challans", exist_ok=True)
    os.makedirs("snapshots", exist_ok=True)
    
    with open("challans/dummy.pdf", "w") as f: f.write("dummy")
    with open("snapshots/dummy.jpg", "w") as f: f.write("dummy")
    
    # Add dummy violation to DB
    dummy_violation = [{"id": "TEST", "timestamp": "2025-01-01", "speed": 100}]
    with open("violations.json", "w") as f: json.dump(dummy_violation, f)

    # Verify setup worked
    if not os.path.exists("challans/dummy.pdf") or not os.path.exists("snapshots/dummy.jpg"):
        print("[ERROR] Failed to create dummy files!")
        return

    # 2. Call API
    print("[ACTION] Calling /api/clear_history...")
    try:
        response = requests.post(f"{BASE_URL}/api/clear_history")
        if response.status_code == 200:
            print("[SUCCESS] API returned 200 OK")
        else:
            print(f"[ERROR] API returned {response.status_code}: {response.text}")
            return
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")
        print("Ensure the Flask app is running!")
        return

    # 3. Verify Effects
    print("[VERIFY] Checking filesystem and database...")
    
    # Check Files
    if os.path.exists("challans/dummy.pdf"):
        print("[FAIL] Challan file was NOT deleted!")
    else:
        print("[PASS] Challan file deleted.")
        
    if os.path.exists("snapshots/dummy.jpg"):
        print("[FAIL] Snapshot file was NOT deleted!")
    else:
        print("[PASS] Snapshot file deleted.")

    # Check Database
    try:
        with open("violations.json", "r") as f:
            data = json.load(f)
            if len(data) == 0:
                print("[PASS] Violations DB is empty.")
            else:
                print(f"[FAIL] Violations DB not empty: {data}")
    except Exception as e:
        print(f"[FAIL] Error reading DB: {e}")

    print("--- Verification Complete ---")

if __name__ == "__main__":
    verify_clear_history()
