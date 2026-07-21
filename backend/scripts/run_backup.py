#!/usr/bin/env python3
"""
SmartBill Auto-Backup Cron Script
==================================
Run this script via cPanel Cron Jobs to take a daily PostgreSQL backup.

Usage in cPanel Cron (daily at 2:00 AM):
    0 2 * * * /home/qhmwlequ/domains/newapi.mayurpatil.in/smartbill/venv/bin/python \
              /home/qhmwlequ/domains/newapi.mayurpatil.in/smartbill/scripts/run_backup.py \
              >> /home/qhmwlequ/domains/newapi.mayurpatil.in/smartbill/logs/cron_backup.log 2>&1

This script directly calls the backup service -- no HTTP/JWT needed.
"""
import sys
import os
from datetime import datetime

# -- Ensure backend directory is on sys.path ---------------------------------
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# -- Load production .env ----------------------------------------------------
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(BACKEND_DIR, ".env"), override=True)

# -- Run Backup --------------------------------------------------------------
def main():
    print(f"[{datetime.now().isoformat()}] SmartBill Cron Backup starting...")

    try:
        from app.services.backup_service import backup_manager

        filename = backup_manager.create_backup(auto=True, format="dump")

        if filename:
            print(f"[{datetime.now().isoformat()}] Backup successful: {filename}")
            sys.exit(0)
        else:
            print(f"[{datetime.now().isoformat()}] Backup returned None -- check logs above.")
            sys.exit(1)

    except Exception as e:
        print(f"[{datetime.now().isoformat()}] Backup FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
