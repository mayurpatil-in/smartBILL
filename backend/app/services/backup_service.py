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
    PG_BIN_PATH = r"C:\Program Files\PostgreSQL\18\bin"
    PG_DUMP_EXE = os.path.join(PG_BIN_PATH, "pg_dump.exe")
    PSQL_EXE = os.path.join(PG_BIN_PATH, "psql.exe")
    PG_RESTORE_EXE = os.path.join(PG_BIN_PATH, "pg_restore.exe")
else:  # Linux / VPS
    PG_DUMP_EXE = shutil.which("pg_dump") or "pg_dump"
    PSQL_EXE = shutil.which("psql") or "psql"
    PG_RESTORE_EXE = shutil.which("pg_restore") or "pg_restore"

class BackupManager:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        # Directory is ensured by app.core.paths

    def start_scheduler(self):
        # Default: Daily backup at 2:00 AM
        self.scheduler.add_job(
            self.create_backup, 
            'cron', 
            hour=2, 
            minute=0, 
            id='daily_backup_dump', 
            replace_existing=True,
            kwargs={"format": "dump"}
        )
        self.scheduler.start()

    def _create_notification(self, title: str, message: str, type: str):
        """Helper to safely create a DB notification"""
        try:
            # Lazy import to avoid circular dep if any
            from app.database.session import SessionLocal
            from app.models.notification import Notification
            
            db = SessionLocal()
            notif = Notification(title=title, message=message, type=type)
            db.add(notif)
            db.commit()
            db.close()
        except Exception as e:
            print(f"Failed to create notification: {e}")

    def _derive_key(self, password: str, salt: bytes) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))

    def _get_db_type(self):
        """Detect database type: 'sqlite' or 'postgresql'"""
        if "sqlite" in settings.DATABASE_URL:
            return "sqlite"
        return "postgresql"

    def _get_sqlite_path(self):
        """Extract path from sqlite:///... url"""
        url = settings.DATABASE_URL
        if url.startswith("sqlite:///"):
            return url.replace("sqlite:///", "")
        return "sql_app.db"

    def _get_db_config(self):
        """Parse DATABASE_URL to get connection details for Postgres"""
        url = settings.DATABASE_URL
        if "+psycopg2" in url:
            url = url.replace("+psycopg2", "")
        
        parsed = urlparse(url)
        return {
            "user": parsed.username,
            "password": parsed.password,
            "host": parsed.hostname,
            "port": parsed.port or 5432,
            "dbname": parsed.path.lstrip('/')
        }

    def create_backup(self, auto=True, password: str = None, format: str = "sql"):
        """
        Create a backup of the database (SQLite or Postgres).
        """
        db_type = self._get_db_type()
        print(f"Starting backup ({db_type})... Auto={auto}, Encrypted={bool(password)}")
        
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
                 f"Backup created: {filename}",
                 "success"
            )
            return filename
            
        except Exception as e:
            print(f"Backup failed: {e}")
            self._create_notification("Backup Failed", f"Error: {str(e)}", "error")
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
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"pg_dump failed: {result.stderr}")
            return False
        return True

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
        path = os.path.join(BACKUP_DIR, filename)
        if os.path.exists(path):
            os.remove(path)
            return True
        return False
        
    def prune_backups(self):
        backups = self.list_backups()
        auto_backups = [b for b in backups if b['filename'].startswith("auto_")]
        
        if len(auto_backups) > 7:
            for b in auto_backups[7:]:
                self.delete_backup(b['filename'])

backup_manager = BackupManager()
