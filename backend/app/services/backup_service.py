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

BACKUP_DIR = "backups"
# PostgreSQL Binaries Path
PG_BIN_PATH = r"C:\Program Files\PostgreSQL\18\bin"
PG_DUMP_EXE = os.path.join(PG_BIN_PATH, "pg_dump.exe")
PSQL_EXE = os.path.join(PG_BIN_PATH, "psql.exe")

class BackupManager:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)

    def start_scheduler(self):
        # Default: Daily backup at 2:00 AM
        self.scheduler.add_job(self.create_backup, 'cron', hour=2, minute=0, id='daily_backup', replace_existing=True)
        self.scheduler.start()

    def _derive_key(self, password: str, salt: bytes) -> bytes:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))

    def _get_db_config(self):
        """Parse DATABASE_URL to get connection details"""
        url = settings.DATABASE_URL
        # Handle asyncpg or psycopg2 prefixes if present
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

    async def _get_pg_executable(self, name):
        """
        Get path to postgres executable.
        Currently hardcoded for Windows as per environment.
        """
        # Hardcoded path based on user environment
        base_path = r"C:\Program Files\PostgreSQL\18\bin"
        return os.path.join(base_path, f"{name}.exe")

    def create_backup(self, auto=True, password: str = None, format: str = "sql"):
        """
        Create a backup of the PostgreSQL database.
        format: 'sql' (Plain Text) or 'dump' (Custom Binary)
        """
        print(f"Starting backup... Auto={auto}, Encrypted={bool(password)}, Format={format}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        prefix = "auto_backup" if auto else "manual_backup"
        ext = "dump" if format == "dump" else "sql"
        filename = f"{prefix}_{timestamp}.{ext}"
        
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
            
        file_path = os.path.join(BACKUP_DIR, filename)
        
        db_conf = self._get_db_config()
        
        # Prepare Environment for Password
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
            cmd.extend(["-F", "c"]) # Custom format (compressed binary)
        else:
            cmd.extend(["-F", "p", "-c"]) # Plain text (default) and clean (DROP commands)
        
        try:
            print(f"Running pg_dump to {file_path}...")
            # Run pg_dump
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode != 0:
                print(f"pg_dump failed: {result.stderr}")
                return None

            if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
                 print("Backup file created but is empty.")
                 return None

            # Encryption Logic
            if password:
                salt = os.urandom(16)
                key = self._derive_key(password, salt)
                f = Fernet(key)
                
                with open(file_path, "rb") as db_file:
                    data = db_file.read()
                
                encrypted_data = f.encrypt(data)
                
                enc_filename = filename.replace(f".{ext}", ".enc")
                enc_path = os.path.join(BACKUP_DIR, enc_filename)
                
                # Prepend salt to the file for decryption later
                with open(enc_path, "wb") as backup_file:
                    backup_file.write(salt + encrypted_data)
                
                # Remove the plain .sql file
                os.remove(file_path)
                
                if auto:
                    self.prune_backups()
                return enc_filename
            
            if auto:
                self.prune_backups()
            return filename
            
        except Exception as e:
            print(f"Backup failed: {e}")
            return None

    def decrypt_backup_file(self, file_path, password):
        """
        Decrypts a file and returns the temporary decrypted path.
        """
        if not os.path.exists(file_path):
            raise Exception("File not found")
            
        with open(file_path, "rb") as f:
            file_content = f.read()
            
        # Extract salt (first 16 bytes)
        salt = file_content[:16]
        encrypted_data = file_content[16:]
        
        key = self._derive_key(password, salt)
        fernet = Fernet(key)
        
        try:
            decrypted_data = fernet.decrypt(encrypted_data)
            # Determine original extension from encrypted filename
            original_ext = "sql"
            if file_path.endswith(".dump.enc"):
                original_ext = "dump"
            temp_path = file_path.replace(".enc", f".{original_ext}")
            with open(temp_path, "wb") as out:
                out.write(decrypted_data)
            return temp_path
        except:
             raise Exception("Invalid password or corrupted file")

    def restore_database(self, sql_file_path, format: str = "sql"):
        """
        Restore database from file (.sql using psql, .dump using pg_restore)
        """
        db_conf = self._get_db_config()
        env = os.environ.copy()
        if db_conf["password"]:
            env["PGPASSWORD"] = db_conf["password"]

        # Determine if it's a binary dump
        is_binary = sql_file_path.endswith(".dump") or format == "dump"
        
        if is_binary:
            pg_restore_exe = r"C:\Program Files\PostgreSQL\18\bin\pg_restore.exe"
            # pg_restore: -c (clean), -d (dbname)
            cmd = [
                pg_restore_exe,
                "-h", str(db_conf["host"]),
                "-p", str(db_conf["port"]),
                "-U", str(db_conf["user"]),
                "-c",
                "-d", str(db_conf["dbname"]),
                sql_file_path
            ]
            tool_name = "pg_restore"
        else:
            psql_exe = r"C:\Program Files\PostgreSQL\18\bin\psql.exe"
            cmd = [
                psql_exe,
                "-h", str(db_conf["host"]),
                "-p", str(db_conf["port"]),
                "-U", str(db_conf["user"]),
                "-d", str(db_conf["dbname"]),
                "-f", sql_file_path
            ]
            tool_name = "psql"

        print(f"Restoring using {tool_name} from {sql_file_path}...")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            # pg_restore often emits warnings that look like errors but are non-fatal
            # However, strictly it returns 0 on success.
            # We will log it.
            print(f"{tool_name} output: {result.stderr}")
            if "fatal" in result.stderr.lower() or "error" in result.stderr.lower():
                 raise Exception(f"Restore failed: {result.stderr}")

        return True

    def list_backups(self):
        files = glob.glob(os.path.join(BACKUP_DIR, "*")) 
        backups = []
        for f in files:
            if not (f.endswith(".sql") or f.endswith(".enc") or f.endswith(".dump")): 
                continue
                
            stat = os.stat(f)
            backups.append({
                "filename": os.path.basename(f),
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "is_encrypted": f.endswith(".enc")
            })
        # Sort by creation time desc
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        return backups

    def delete_backup(self, filename: str):
        path = os.path.join(BACKUP_DIR, filename)
        if os.path.exists(path):
            os.remove(path)
            return True
        return False
        
    def prune_backups(self):
        """
        Keep only the last 7 automatic backups.
        """
        backups = self.list_backups()
        auto_backups = [b for b in backups if b['filename'].startswith("auto_")]
        
        if len(auto_backups) > 7:
            for b in auto_backups[7:]:
                self.delete_backup(b['filename'])

backup_manager = BackupManager()
