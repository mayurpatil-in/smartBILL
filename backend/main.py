import uvicorn
import os
import sys
import multiprocessing

# Necessary for PyInstaller
multiprocessing.freeze_support()

# Add current directory to path so imports work
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

def main():
    # In a real sidecar, we might accept a port from command line args
    # For now, we use 8000
    port = 8000
    print(f"Starting backend on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")

if __name__ == "__main__":
    main()
