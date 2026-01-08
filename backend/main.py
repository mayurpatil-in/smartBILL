import uvicorn
import os
import sys
import multiprocessing
import traceback
import datetime

# Setup basic file logging immediately
# If frozen, log next to executable. If dev, log in current dir.
log_file = os.path.join(os.path.dirname(os.path.abspath(sys.executable)), "backend_debug.log") if getattr(sys, 'frozen', False) else "backend_debug.log"

def log(msg):
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            timestamp = datetime.datetime.now().isoformat()
            f.write(f"[{timestamp}] {msg}\n")
    except Exception:
        pass # Fallback if we can't write to log

class LoggerWriter:
    def __init__(self, writer):
        self.writer = writer
        self.terminal = sys.stdout

    def write(self, message):
        try:
            if self.terminal:
                self.terminal.write(message)
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(message)
        except Exception:
            pass

    def flush(self):
        try:
            if self.terminal:
                self.terminal.flush()
        except Exception:
            pass

    def isatty(self):
        try:
            return self.terminal.isatty() if self.terminal else False
        except Exception:
            return False

    def fileno(self):
        try:
            return self.terminal.fileno() if self.terminal else 1
        except Exception:
            return 1

# Redirect stdout and stderr
sys.stdout = LoggerWriter(sys.stdout)
sys.stderr = LoggerWriter(sys.stderr)

log("Backend process started.")

# Necessary for PyInstaller - MUST be first
multiprocessing.freeze_support()
log("Freeze support called.")

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
log(f"Path modified. CWD: {os.getcwd()}")

def setup_desktop_env():
    """Confingure environment variables for Desktop Sidecar mode"""
    # Detect if running as PyInstaller Bundle (frozen)
    if getattr(sys, 'frozen', False):
        log("Running in FROZEN mode (Desktop Sidecar).")
        try:
            # Check for .env file next to executable
            exe_dir = os.path.dirname(os.path.abspath(sys.executable))
            env_path = os.path.join(exe_dir, ".env")
            if os.path.exists(env_path):
                 log(f"Loading .env from {env_path}")
                 log(f"DATABASE_URL before loading: {os.environ.get('DATABASE_URL', 'NOT SET')}")
                 
                 # Manually parse .env file instead of using load_dotenv
                 try:
                     with open(env_path, 'r', encoding='utf-8') as f:
                         for line in f:
                             line = line.strip()
                             if line and not line.startswith('#') and '=' in line:
                                 key, value = line.split('=', 1)
                                 os.environ[key.strip()] = value.strip()
                                 log(f"Set {key.strip()} from .env")
                 except Exception as e:
                     log(f"Error parsing .env: {e}")
                 
                 log(f"DATABASE_URL after loading: {os.environ.get('DATABASE_URL', 'NOT SET')}")

            app_name = "SmartBill"
            # Use APPDATA for persistent storage
            # e.g., C:\Users\Username\AppData\Roaming\SmartBill
            app_data = os.path.join(os.environ.get("APPDATA", "."), app_name)
            os.makedirs(app_data, exist_ok=True)
            log(f"AppData directory ensured: {app_data}")
            
            # 1. Set Database URL if Not Set
            if "DATABASE_URL" not in os.environ:
                db_path = os.path.join(app_data, "smartbill.db")
                # Handle Windows paths for SQLAlchemy
                db_url = f"sqlite:///{db_path.replace(os.sep, '/')}"
                os.environ["DATABASE_URL"] = db_url
                log(f"Set DATABASE_URL: {db_url}")
            else:
                log(f"Using DATABASE_URL from .env: {os.environ['DATABASE_URL']}")
            
            # 2. Set Fallback JWT Secret (if not present)
            if "JWT_SECRET_KEY" not in os.environ:
                 os.environ["JWT_SECRET_KEY"] = "smartbill-desktop-secret-key-persistent"
                 log("Set default JWT_SECRET_KEY")
                 
            # 3. Ensure Backend URL is set (for QR codes)
            if "BACKEND_URL" not in os.environ:
                os.environ["BACKEND_URL"] = "http://localhost:8000"
                
            return True
        except Exception as e:
            log(f"Error in setup_desktop_env: {e}")
            log(traceback.format_exc())
            return False
    else:
        log("Running in DEV mode (Source).")
            
    return False

def main():
    try:
        # 1. Setup Env
        is_desktop = setup_desktop_env()
        
        # 2. Import App (Delayed until Env is set)
        log("Importing app.main...")
        from app.main import app
        log("App imported successfully.")
        
        # 3. Initialize DB tables if Desktop
        if is_desktop:
            try:
                from app.database.init_db import init_db
                log("Initializing Desktop Database...")
                init_db()
                log("Database initialized successfully.")
            except Exception as e:
                log(f"Database Initialization Failed: {e}")
                log(traceback.format_exc())

        # 4. Start Server
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
