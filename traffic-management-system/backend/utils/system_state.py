
import time

# Global state to track when the last system reset occurred.
# This allows running threads (like detectors) to know if they should reset their local counters.
_last_reset_time = 0.0

def set_reset_time():
    """Updates the reset time to now."""
    global _last_reset_time
    _last_reset_time = time.time()

def get_last_reset_time():
    """Returns the timestamp of the last reset."""
    return _last_reset_time
