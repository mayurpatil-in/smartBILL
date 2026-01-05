import sys
import os
import asyncio

# Ensure backend directory is in path
sys.path.append(os.getcwd())

from app.services.backup_service import backup_manager

async def main():
    print("Triggering create_backup(format='dump')...")
    filename = backup_manager.create_backup(auto=False, format="dump")
    print(f"Result Filename: {filename}")
    
    file_path = os.path.join("backups", filename)
    if os.path.exists(file_path):
        size = os.path.getsize(file_path)
        print(f"File Size: {size} bytes")
        if size > 0:
            print("SUCCESS: Valid dump created.")
            # cleanup
            os.remove(file_path)
        else:
            print("FAILURE: File is 0 bytes.")
    else:
        print("FAILURE: File not found.")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())
