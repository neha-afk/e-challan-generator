import requests
import sys

def verify_lanes():
    try:
        response = requests.get('http://127.0.0.1:5000/api/lanes')
        if response.status_code == 200:
            lanes = response.json()
            print(f"Success: Retrieved {len(lanes)} lanes.")
            print(f"Lanes: {lanes}")
            if len(lanes) > 0:
                print("API Verification Passed")
            else:
                print("Warning: API returned 0 lanes (check videos/ dir)")
        else:
            print(f"Failed: Status Code {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"Failed to connect: {e}")
        sys.exit(1)

if __name__ == "__main__":
    verify_lanes()
