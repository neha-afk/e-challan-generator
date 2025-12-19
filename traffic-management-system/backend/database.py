import json
import os
from utils.config import PROJECT_ROOT

DB_FILE = os.path.join(PROJECT_ROOT, "violations.json")

def load_violations():
    """Reads the violation list from the JSON file."""
    if not os.path.exists(DB_FILE):
        return []
    try:
        with open(DB_FILE, 'r') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []

def save_violation(record):
    """
    Appends a new violation record to the JSON file.
    record: dict containing violation details
    """
    data = load_violations()
    data.insert(0, record) # Prepend to show newest first
    
    # Optional: Limit size to keep file manageable (e.g., last 1000)
    if len(data) > 1000:
        data = data[:1000]
        
    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"[DATABASE] Saved violation for ID {record.get('id')}")

def get_all_violations():
    """Returns all violations."""
    return load_violations()

def clear_all_data():
    """Clears all violation data from the JSON file."""
    with open(DB_FILE, 'w') as f:
        json.dump([], f, indent=4)
    print("[DATABASE] All violation data cleared.")
