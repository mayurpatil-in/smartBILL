import logging
import sys
from logging.handlers import RotatingFileHandler
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import os
from app.core.paths import LOG_DIR

# Ensure log directory exists
os.makedirs(LOG_DIR, exist_ok=True)

# Define log file path
LOG_FILE = os.path.join(LOG_DIR, "app.log")

def setup_logger():
    """Configure the application-wide logger."""
    logger = logging.getLogger("smartbill")
    logger.setLevel(logging.INFO)

    # Prevent logging from propagating to the root logger multiple times
    if logger.handlers:
        return logger

    # Log format
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # 1. Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. Rotating File Handler (Max 5MB per file, keep last 5 backups)
    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger

# Initialize the global logger instance
logger = setup_logger()

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log incoming HTTP requests, their processing time, and the response status.
    This provides critical observability into the backend's behavior.
    """
    async def dispatch(self, request: Request, call_next):
        # Skip logging for health checks or static paths if desired
        if request.url.path in ["/health", "/docs", "/openapi.json"]:
            return await call_next(request)

        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        url = str(request.url)

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000  # Convert to ms
            status_code = response.status_code

            log_msg = f"{client_ip} - {method} {request.url.path} - {status_code} - {process_time:.2f}ms"
            
            # Log as INFO for successful requests, WARNING/ERROR for others
            if status_code >= 500:
                logger.error(log_msg)
            elif status_code >= 400:
                logger.warning(log_msg)
            else:
                logger.info(log_msg)
                
            return response
            
        except Exception as e:
            process_time = (time.time() - start_time) * 1000
            logger.exception(f"{client_ip} - {method} {request.url.path} - 500 - {process_time:.2f}ms - Exception: {str(e)}")
            raise
