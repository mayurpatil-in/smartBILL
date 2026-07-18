import os
import shutil
import glob
import subprocess
import base64
from datetime import datetime
from urllib.parse import urlparse
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings
from app.core.paths import BACKUP_DIR

# PostgreSQL Binaries Path
# Dynamic path resolution for cross-platform support
if os.name == 'nt':  # Windows
    def find_pg_tool_win(tool_name):
        tool_path = shutil.which(tool_name)
        if tool_path: return tool_path
        
        # Check standard Postgres paths for versions 12 to 18
        for version in range(18, 11, -1):
            p = rf"C:\Program Files\PostgreSQL\{version}\bin\{tool_name}.exe"
            if os.path.exists(p):
                return p
        return tool_name + ".exe"

    PG_DUMP_EXE = find_pg_tool_win("pg_dump")
    PSQL_EXE = find_pg_tool_win("psql")
    PG_RESTORE_EXE = find_pg_tool_win("pg_restore")
else:  # Linux / VPS
    def find_pg_tool(tool_name):
        tool_path = shutil.which(tool_name)
        if tool_path: return tool_path
        # Search common cPanel / Linux paths
        common_paths = [
            f"/usr/bin/{tool_name}",
            f"/usr/local/bin/{tool_name}",
            f"/usr/pgsql-15/bin/{tool_name}",
            f"/usr/pgsql-14/bin/{tool_name}",
            f"/usr/pgsql-16/bin/{tool_name}",
            f"/opt/cpanel/ea-php81/root/usr/bin/{tool_name}" # Example cPanel path
        ]
        for p in common_paths:
            if os.path.exists(p) and os.access(p, os.X_OK):
                return p
        return tool_name

    PG_DUMP_EXE = find_pg_tool("pg_dump")
    PSQL_EXE = find_pg_tool("psql")
    PG_RESTORE_EXE = find_pg_tool("pg_restore")

class BackupManager:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        print(f"BACKUP_MANAGER: Initialized in PID {os.getpid()}")
        # Directory is ensured by app.core.paths

    def start_scheduler(self):
        # Default: Daily backup at 2:00 AM
        if self.scheduler.running:
             print(f"BACKUP_MANAGER: Scheduler already running in PID {os.getpid()}")
             return

        print(f"BACKUP_MANAGER: Starting Scheduler in PID {os.getpid()}")
        self.scheduler.add_job(
            self.create_backup,
            'cron',
            hour=2,
            minute=0,
            id='daily_backup_dump',
            replace_existing=True,
            kwargs={"format": "dump"}
        )

        # [NOTIFICATION] Daily overdue invoice scan — fires at 9:00 AM every day
        self.scheduler.add_job(
            self.scan_overdue_invoices,
            'cron',
            hour=9,
            minute=0,
            id='daily_overdue_scan',
            replace_existing=True
        )

        # [NOTIFICATION] Daily subscription expiry scan — fires at 8:00 AM every day
        self.scheduler.add_job(
            self.scan_expiring_subscriptions,
            'cron',
            hour=8,
            minute=0,
            id='daily_subscription_scan',
            replace_existing=True
        )

        self.scheduler.start()

        # [SMART BACKUP] Check if we missed today's backup (e.g. app was closed)
        # Run safely in background after 60s to avoid slowing down startup
        self.scheduler.add_job(
            self.check_and_run_missed_backup,
            'date',
            run_date=datetime.now(),  # Run "now" (async)
            id='smart_startup_check'
        )

    def check_and_run_missed_backup(self):
        """
        Check if an auto-backup exists for today. 
        If not, create one immediately (Smart Catch-up).
        """
        try:
            today_str = datetime.now().strftime("%Y%m%d")
            backups = self.list_backups()
            
            # Check if any auto backup starts with today's date
            has_backup_today = any(
                b['filename'].startswith(f"auto_backup_{today_str}") 
                for b in backups
            )
            
            if not has_backup_today:
                print(f"BACKUP_MANAGER: No backup found for today ({today_str}). Triggering Smart Catch-up...")
                # We use a slight delay or just run it. 
                # Since this is async job, it won't block main thread.
                self.create_backup(auto=True, format="dump")
            else:
                print(f"BACKUP_MANAGER: Backup for today ({today_str}) already exists. Skipping.")
                
        except Exception as e:
            print(f"BACKUP_MANAGER: Smart check failed: {e}")

    def _create_notification(self, title: str, message: str, type: str, company_id: int | None = None):
        """Helper to safely create a DB notification (backup events).
        Uses notification_service for deduplication and company scoping.
        company_id=None → global notification visible to all companies.
        """
        try:
            from app.database.session import SessionLocal
            from app.services.notification_service import create_notification
            db = SessionLocal()
            create_notification(
                db=db,
                company_id=company_id,
                title=title,
                message=message,
                type=type,
            )
            db.close()
        except Exception as e:
            print(f"[BackupManager] Failed to create notification: {e}")

    def scan_overdue_invoices(self):
        """
        Scheduled daily scan (9:00 AM) — finds overdue unpaid invoices and
        creates one summary notification per company.
        """
        try:
            from app.database.session import SessionLocal
            from app.models.invoice import Invoice
            from app.services.notification_service import create_notification
            from datetime import date

            db = SessionLocal()
            today = date.today()

            overdue = db.query(Invoice).filter(
                Invoice.due_date < today,
                Invoice.payment_status != "PAID",
                Invoice.status != "CANCELLED",
            ).all()

            # Group by company so each company gets one summary notification
            company_counts: dict[int, int] = {}
            for inv in overdue:
                company_counts[inv.company_id] = company_counts.get(inv.company_id, 0) + 1

            for cid, count in company_counts.items():
                label = "Invoice" if count == 1 else "Invoices"
                create_notification(
                    db=db,
                    company_id=cid,
                    title=f"{count} Overdue {label}",
                    message=f"{count} invoice(s) are past their due date. Review your receivables.",
                    type="error",
                    dedup_seconds=3600,   # 1-hour dedup for daily scans
                )
            db.close()
            print(f"[BackupManager] Overdue scan: {len(company_counts)} companies notified.")
        except Exception as e:
            print(f"[BackupManager] Overdue invoice scan failed: {e}")

    def scan_expiring_subscriptions(self):
        """
        Scheduled daily scan (8:00 AM) — finds companies with subscriptions
        expiring within 7 days and creates a warning notification for each.
        """
        try:
            from app.database.session import SessionLocal
            from app.models.company import Company
            from app.services.notification_service import create_notification
            from datetime import date

            db = SessionLocal()
            today = date.today()

            companies = db.query(Company).filter(
                Company.is_active == True
            ).all()

            notified = 0
            for company in companies:
                if not company.subscription_end:
                    continue
                days_left = (company.subscription_end - today).days
                if 0 <= days_left <= 7:
                    create_notification(
                        db=db,
                        company_id=company.id,
                        title="Subscription Expiring Soon",
                        message=f"Your subscription expires in {days_left} day(s). Please renew to avoid service interruption.",
                        type="warning",
                        dedup_seconds=3600,  # 1-hour dedup for daily scans
                    )
                    notified += 1
            db.close()
            print(f"[BackupManager] Subscription scan: {notified} companies notified.")
        except Exception as e:
            print(f"[BackupManager] Subscription expiry scan failed: {e}")

    # --- HELPER METHODS ---
    def _get_db_type(self):
        if settings.DATABASE_URL.startswith("sqlite"):
            return "sqlite"
        return "postgresql"

    def _get_sqlite_path(self):
        # sqlite:///C:/path/to.db  -> C:/path/to.db
        return settings.DATABASE_URL.replace("sqlite:///", "")

    def _get_db_config(self):
        """Parse DATABASE_URL for Postgres params"""
        from sqlalchemy.engine.url import make_url
        u = make_url(settings.DATABASE_URL)
        return {
            "user": u.username,
            "password": u.password,
            "host": u.host,
            "port": u.port or 5432,
            "dbname": u.database
        }

    def _derive_key(self, password: str, salt: bytes) -> bytes:
        """Derive a 32-byte key from password using PBKDF2"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))

    def create_backup(self, auto=True, password: str = None, format: str = "sql"):
        """
        Create a backup of the database (SQLite or Postgres).
        """
        db_type = self._get_db_type()
        print(f"BACKUP_MANAGER: Starting backup ({db_type})... Auto={auto}, PID={os.getpid()}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        prefix = "auto_backup" if auto else "manual_backup"
        
        # SQLite always uses .db extension for raw copy, or .sql if we implemented dump (complex)
        # For simplicity/reliability in Desktop app, we copy the .db file.
        ext = "db" if db_type == "sqlite" else ("dump" if format == "dump" else "sql")
        filename = f"{prefix}_{timestamp}.{ext}"
        
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
            
        file_path = os.path.join(BACKUP_DIR, filename)
        
        try:
            if db_type == "sqlite":
                source_db = self._get_sqlite_path()
                if not os.path.exists(source_db):
                     raise Exception(f"Source DB not found at {source_db}")
                # Simple file copy for SQLite
                shutil.copy2(source_db, file_path)
            else:
                # PostgreSQL Logic
                if not self._run_pg_dump(file_path, format):
                    return None

            # Encryption Logic (Shared)
            if password:
                return self._encrypt_file(file_path, filename, password, auto)
            
            if auto:
                self.prune_backups()
                
            self._create_notification(
                 "Auto Backup Successful" if auto else "Manual Backup Successful", 
                 f"Backup created: {filename} (PID: {os.getpid()})",
                 "success"
            )
            return filename
            
        except Exception as e:
            print(f"Backup failed: {e}")
            self._create_notification("Backup Failed", f"Error: {str(e)}", "error")
            if not auto:
                raise e
            return None

    def _run_pg_dump(self, file_path, format):
        """Internal helper for running pg_dump"""
        db_conf = self._get_db_config()
        env = os.environ.copy()
        if db_conf["password"]:
            env["PGPASSWORD"] = db_conf["password"]

        cmd = [
            PG_DUMP_EXE,
            "-h", str(db_conf["host"]),
            "-p", str(db_conf["port"]),
            "-U", str(db_conf["user"]),
            "-f", file_path,
            db_conf["dbname"]
        ]
        
        if format == "dump":
            cmd.extend(["-F", "c"])
        else:
            cmd.extend(["-F", "p", "-c"])
        
        try:
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if result.returncode != 0:
                error_msg = f"pg_dump failed: {result.stderr}"
                print(error_msg)
                raise Exception(error_msg)
            return True
        except FileNotFoundError:
            error_msg = f"pg_dump executable not found at '{PG_DUMP_EXE}'. Cannot backup Postgres on this server."
            print(error_msg)
            raise Exception(error_msg)

    def _encrypt_file(self, file_path, filename, password, auto):
        """Encrypts a file and handles cleanup"""
        try:
            salt = os.urandom(16)
            key = self._derive_key(password, salt)
            f = Fernet(key)
            
            with open(file_path, "rb") as db_file:
                data = db_file.read()
            
            encrypted_data = f.encrypt(data)
            
            # Determine extension for encrypted file
            # e.g. .db -> .db.enc, .sql -> .sql.enc
            enc_filename = filename + ".enc"
            enc_path = os.path.join(BACKUP_DIR, enc_filename)
            
            # Prepend salt
            with open(enc_path, "wb") as backup_file:
                backup_file.write(salt + encrypted_data)
            
            os.remove(file_path) # Remove unencrypted
            
            if auto:
                self.prune_backups()
                
            self._create_notification(
                "Backup Successful (Encrypted)", 
                f"File: {enc_filename}",
                "success"
            )
            return enc_filename
        except Exception as e:
            print(f"Encryption failed: {e}")
            return None

    def decrypt_backup_file(self, file_path, password):
        """Decrypts a file and returns the temporary decrypted path."""
        if not os.path.exists(file_path):
            raise Exception("File not found")
            
        with open(file_path, "rb") as f:
            file_content = f.read()
            
        salt = file_content[:16]
        encrypted_data = file_content[16:]
        
        key = self._derive_key(password, salt)
        fernet = Fernet(key)
        
        try:
            decrypted_data = fernet.decrypt(encrypted_data)
            # Restore original extension by removing .enc
            # e.g. backup.db.enc -> backup.db
            temp_path = file_path.replace(".enc", "")
            with open(temp_path, "wb") as out:
                out.write(decrypted_data)
            return temp_path
        except:
             raise Exception("Invalid password or corrupted file")

    def restore_database(self, file_path, format: str = "sql"):
        """
        Restore database from file.
        SQLite: Overwrites .db file.
        Postgres: Uses pg_restore/psql.
        """
        db_type = self._get_db_type()
        
        try:
            if db_type == "sqlite":
                target_db = self._get_sqlite_path()
                # For SQLite, we just copy the backup over the current DB
                # CAUTION: This replaces the file immediately.
                # In a real app, might want to close connections first.
                print(f"Restoring SQLite DB from {file_path} to {target_db}...")
                shutil.copy2(file_path, target_db)
                return True
            else:
                return self._restore_postgres(file_path, format)
        except Exception as e:
            raise Exception(f"Restore failed: {e}")

    def _restore_postgres(self, sql_file_path, format):
        """Internal helper for Postgres restore"""
        db_conf = self._get_db_config()
        env = os.environ.copy()
        if db_conf["password"]:
            env["PGPASSWORD"] = db_conf["password"]

        is_binary = sql_file_path.endswith(".dump") or format == "dump"
        tool_name = "pg_restore" if is_binary else "psql"

        if is_binary:
            cmd = [
                PG_RESTORE_EXE, "-h", str(db_conf["host"]), "-p", str(db_conf["port"]),
                "-U", str(db_conf["user"]), "-c", "-d", str(db_conf["dbname"]),
                sql_file_path
            ]
        else:
            cmd = [
                PSQL_EXE, "-h", str(db_conf["host"]), "-p", str(db_conf["port"]),
                "-U", str(db_conf["user"]), "-d", str(db_conf["dbname"]),
                "-f", sql_file_path
            ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            if "fatal" in result.stderr.lower() or "error" in result.stderr.lower():
                 raise Exception(f"Restore failed: {result.stderr}")
        return True

    def list_backups(self):
        files = glob.glob(os.path.join(BACKUP_DIR, "*")) 
        backups = []
        for f in files:
            # Include .db backups for SQLite
            if not (f.endswith(".sql") or f.endswith(".enc") or f.endswith(".dump") or f.endswith(".db")): 
                continue
                
            stat = os.stat(f)
            backups.append({
                "filename": os.path.basename(f),
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "is_encrypted": f.endswith(".enc")
            })
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        return backups

    def delete_backup(self, filename: str):
        # [SECURITY] Sanitize filename to prevent path traversal
        filename = os.path.basename(filename)
        path = os.path.join(BACKUP_DIR, filename)
        if os.path.exists(path):
            os.remove(path)
            # Delete encrypted version if exists
            if os.path.exists(path + ".enc"):
                os.remove(path + ".enc")
            return True
        return False
        
    def prune_backups(self):
        backups = self.list_backups()
        auto_backups = [b for b in backups if b['filename'].startswith("auto_")]
        
        if len(auto_backups) > 7:
            for b in auto_backups[7:]:
                self.delete_backup(b['filename'])

backup_manager = BackupManager()
