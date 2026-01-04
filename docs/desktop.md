Desktop Application Walkthrough
Overview
We have successfully configured your Smart Bill Web App to run as a native desktop application using Tauri and a Python Sidecar.

Prerequisites
Before you can run or build the desktop app, you need to install Rust:

Go to https://rustup.rs/ and download the installer for Windows.
Run the installer and follow the onscreen instructions.
Restart your terminal/computer.
How to Run in Development
To test the desktop app alongside your backend:

Install Dependencies:

cd frontend
npm install
cd ../desktop
npm install
Build the Backend Sidecar: (Required before first run!)

cd backend
pip install -r requirements.txt -r requirements-desktop.txt
python build_desktop.py
This will create the executable in desktop/src-tauri/binaries/.

Run Tauri Dev:

cd desktop
npm run tauri dev
This will:

Start the React frontend.
Launch the Desktop window.
Automatically spawn your Python backend sidecar.
How to Build for Production
To create an installer (.msi or .exe):

Build Backend Sidecar (if not already done).
Build Tauri App:
cd desktop
npm run tauri build
The installer will be in desktop/src-tauri/target/release/bundle/msi/.
Architecture Details
Frontend: Standard React/Vite app in frontend/.
Desktop Shell: Tauri app in desktop/. configured to load ../frontend/dist.
Backend: Python FastAPI app in
backend/
. Bundled as a single executable and managed by Tauri as a sidecar process.
Communication: The frontend spawns the backend and communicates via http://localhost:8000.
Notes on Playwright
The backend uses Playwright for PDF generation. The current build script includes basic configuration, but Playwright requires browser binaries.

If PDF generation fails in the desktop app, you may need to ensure a Chromium binary is available or switch to a lighter PDF library for the desktop version.
