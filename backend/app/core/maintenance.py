import os
import json

# Local file to persist maintenance status across workers
MAINTENANCE_FILE = "maintenance.json"

def is_maintenance_mode() -> bool:
    if os.path.exists(MAINTENANCE_FILE):
        try:
            with open(MAINTENANCE_FILE, "r") as f:
                data = json.load(f)
                return data.get("active", False)
        except Exception:
            return False
    return False

def set_maintenance_mode(active: bool):
    with open(MAINTENANCE_FILE, "w") as f:
        json.dump({"active": active}, f)
