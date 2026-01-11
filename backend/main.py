import uvicorn
import os
import sys
import multiprocessing
import traceback
import datetime

# Necessary for PyInstaller - MUST be first
multiprocessing.freeze_support()

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# --- NEW LOGGING LOGIC (SAFE) ---
# We must defer logging setup until we can import paths from ANYWHERE safe.
# But we can try to import app.core.paths now.

try:
    from app.core.paths import LOG_DIR
    
    log_file = os.path.join(LOG_DIR, "backend_entry.log")
    
    def log(msg):
        try:
            timestamp = datetime.datetime.now().isoformat()
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"[{timestamp}] {msg}\n")
            print(msg) # Also print to stdout/console
        except:
            pass
            
except Exception as e:
    # Fallback if paths module fails
    def log(msg):
        print(f"BOOTSTRAP LOG: {msg}")

log("Backend entry point started.")

def main():
    try:
        # 1. Setup Environment via Paths Module
        # Importing app.core.paths automatically sets up directories (AppData/SmartBill)
        log("Importing app.core.paths...")
        import app.core.paths
        log(f"AppData Directory: {app.core.paths.APP_DATA_DIR}")

        # [CRITICAL] Set ENV VARS *before* importing app.main (which imports config)
        # This fixes "field required" errors for Pydantic Settings
        
        # Set DATABASE_URL
        if "DATABASE_URL" not in os.environ:
             db_url = f"sqlite:///{app.core.paths.DB_PATH.replace(os.sep, '/')}"
             os.environ["DATABASE_URL"] = db_url
             log(f"Set DATABASE_URL env var: {db_url}")
             
        # Set JWT_SECRET_KEY
        if "JWT_SECRET_KEY" not in os.environ:
             os.environ["JWT_SECRET_KEY"] = "smartbill-desktop-secret-key-persistent"
             log("Set default JWT_SECRET_KEY env var")

        # 2. Import App
        log("Importing app.main...")
        from app.main import app
        log("App imported successfully.")
        
        # 3. Start Server
        # We rely on app.main:startup_event to handle DB migrations and Super Admin creation
        port = 8000
        log(f"Starting uvicorn on 127.0.0.1:{port}...")
        
        # Reload=False for production/frozen
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info", reload=False)
        
    except Exception as e:
        log(f"CRITICAL MAIN ERROR: {e}")
        log(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
