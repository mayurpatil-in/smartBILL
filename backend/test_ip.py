import socket
from app.core.config import get_backend_url

print(f"Detected Backend URL: {get_backend_url()}")

try:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    ip = s.getsockname()[0]
    s.close()
    print(f"Socket Method IP: {ip}")
except Exception as e:
    print(f"Socket Method Failed: {e}")

print("All Hostnames/IPs:")
try:
    print(socket.gethostbyname_ex(socket.gethostname()))
except Exception as e:
    print(f"Hostname lookup failed: {e}")
