import PyInstaller.__main__
import os
import shutil
import platform

def build_backend():
    print("Building Backend Sidecar...")
    
    # Clean previous builds
    if os.path.exists("dist"):
        shutil.rmtree("dist")
    if os.path.exists("build"):
        shutil.rmtree("build")

    # Define the sidecar name expected by Tauri (includes target triple)
    # Common Windows triple: x86_64-pc-windows-msvc
    # We will rename it after build
    executable_name = "backend-server"
    
    PyInstaller.__main__.run([
        'main.py',
        f'--name={executable_name}',
        '--onefile',
        # '--windowed', # Uncomment for production to hide console
        '--noconfirm',
        '--clean',
        
        # Include static assets and templates
        '--add-data=app/templates;app/templates',
        
        # Alembic (migrations) - bundling this is tricky, for now we might skip or include
        '--add-data=alembic.ini;.',
        '--add-data=alembic;alembic',
        
        # Hidden imports often needed for Uvicorn/FastAPI
        '--hidden-import=uvicorn.logging',
        '--hidden-import=uvicorn.loops',
        '--hidden-import=uvicorn.loops.auto',
        '--hidden-import=uvicorn.protocols',
        '--hidden-import=uvicorn.protocols.http',
        '--hidden-import=uvicorn.protocols.http.auto',
        '--hidden-import=uvicorn.lifespan',
        '--hidden-import=uvicorn.lifespan.on',
        '--hidden-import=sqlalchemy.sql.default_comparator',
    ])

    print("Build complete.")
    print(f"Executable created at dist/{executable_name}.exe")

    # Move to desktop/src-tauri/binaries/
    # Target path: ../desktop/src-tauri/binaries/backend-server-x86_64-pc-windows-msvc.exe
    target_dir = os.path.join("..", "desktop", "src-tauri", "binaries")
    os.makedirs(target_dir, exist_ok=True)
    
    target_triple = "x86_64-pc-windows-msvc" # Assuming standard Windows
    target_path = os.path.join(target_dir, f"{executable_name}-{target_triple}.exe")
    
    source_path = os.path.join("dist", f"{executable_name}.exe")
    
    if os.path.exists(source_path):
        shutil.copy2(source_path, target_path)
        print(f"Copied to {target_path}")
    else:
        print("Error: Executable not found in dist/")

if __name__ == "__main__":
    build_backend()
