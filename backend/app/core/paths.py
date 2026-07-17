import sys
import os

# Base directory of this file = backend/app/core/
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
# Backend directory = two levels up from app/core/
_BACKEND_DIR = os.path.normpath(os.path.join(_THIS_DIR, "..", ".."))


def get_app_data_dir():
    if sys.platform == "win32":
        app_data = os.getenv("APPDATA")
        if app_data:
            base_dir = os.path.join(app_data, "SmartBill")
            if not os.path.exists(base_dir):
                os.makedirs(base_dir)
            return base_dir
    # On Linux/server: use the backend directory for data storage
    return _BACKEND_DIR


APP_DATA_DIR = get_app_data_dir()
UPLOAD_DIR  = os.path.join(APP_DATA_DIR, "uploads")
LOG_DIR     = os.path.join(APP_DATA_DIR, "logs")
BACKUP_DIR  = os.path.join(APP_DATA_DIR, "backups")
DB_PATH     = os.path.join(APP_DATA_DIR, "sql_app.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Ensure directories exist
for _d in [UPLOAD_DIR, LOG_DIR, BACKUP_DIR]:
    os.makedirs(_d, exist_ok=True)
