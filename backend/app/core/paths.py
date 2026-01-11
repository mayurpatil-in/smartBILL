import sys
import os

def get_app_data_dir():
    if sys.platform == "win32":
        app_data = os.getenv("APPDATA")
        if app_data:
            base_dir = os.path.join(app_data, "SmartBill")
            if not os.path.exists(base_dir):
                os.makedirs(base_dir)
            return base_dir
    return "." # Fallback to current dir for dev or non-windows

APP_DATA_DIR = get_app_data_dir()
UPLOAD_DIR = os.path.join(APP_DATA_DIR, "uploads")
LOG_DIR = os.path.join(APP_DATA_DIR, "logs")
BACKUP_DIR = os.path.join(APP_DATA_DIR, "backups")
DB_PATH = os.path.join(APP_DATA_DIR, "sql_app.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

# Ensure directories exist
for d in [UPLOAD_DIR, LOG_DIR, BACKUP_DIR]:
    if not os.path.exists(d):
        os.makedirs(d)
