import os
import glob

BACKUP_DIR = "backups"

def cleanup():
    # remove debug files
    for f in ["debug_backup.py", "debug_pg_dump.py", "trigger_debug_backup.py", "test_export.sql", "backup_debug.log"]:
        if os.path.exists(f):
             try:
                os.remove(f)
                print(f"Removed {f}")
             except: pass

    # remove 0-byte backups
    if os.path.exists(BACKUP_DIR):
        files = glob.glob(os.path.join(BACKUP_DIR, "*"))
        for f in files:
            if os.path.getsize(f) == 0:
                print(f"Removing 0-byte backup: {f}")
                os.remove(f)

if __name__ == "__main__":
    cleanup()
