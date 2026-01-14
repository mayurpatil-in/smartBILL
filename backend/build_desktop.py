import PyInstaller.__main__
import os
import shutil
import platform
from PyInstaller.utils.hooks import collect_all

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
    
    # Collect all data, binaries, and hidden imports for pydantic_settings, passlib, apscheduler, and email_validator
    datas_ps, binaries_ps, hiddenimports_ps = collect_all('pydantic_settings')
    datas_pl, binaries_pl, hiddenimports_pl = collect_all('passlib')
    datas_as, binaries_as, hiddenimports_as = collect_all('apscheduler')
    datas_ev, binaries_ev, hiddenimports_ev = collect_all('email_validator')
    datas_bc, binaries_bc, hiddenimports_bc = collect_all('bcrypt')
    datas_pw, binaries_pw, hiddenimports_pw = collect_all('playwright')
    
    datas = datas_ps + datas_pl + datas_as + datas_ev + datas_bc + datas_pw
    binaries = binaries_ps + binaries_pl + binaries_as + binaries_ev + binaries_bc + binaries_pw
    hiddenimports = hiddenimports_ps + hiddenimports_pl + hiddenimports_as + hiddenimports_ev + hiddenimports_bc + hiddenimports_pw
    
    # Add other needed hidden imports
    hiddenimports.extend([
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'sqlalchemy.sql.default_comparator',
        # 'email_validator', # Handled by collect_all now
        # 'bcrypt', # Handled by collect_all now
        'tzdata',
        'dotenv',
    ])

    # Convert datas to PyInstaller format sep by ;
    # collect_all returns list of (source, dest)
    add_data_args = []
    for source, dest in datas:
        add_data_args.append(f'--add-data={source};{dest}')
        
    # Manually add our app templates
    add_data_args.append('--add-data=app/templates;app/templates')
    add_data_args.append('--add-data=alembic.ini;.')
    add_data_args.append('--add-data=alembic;alembic')

    args = [
        'main.py',
        f'--name={executable_name}',
        '--onefile',
        # '--windowed', # Uncomment for production to hide console
        '--noconfirm',
        '--clean',
    ] + add_data_args + [f'--hidden-import={h}' for h in hiddenimports]
    
    PyInstaller.__main__.run(args)

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
