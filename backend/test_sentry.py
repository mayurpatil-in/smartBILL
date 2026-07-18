"""
Sentry Connection Test Script
Run this to verify your Sentry DSN is working correctly.
Usage: python test_sentry.py
"""
import os
import sys

# Fix Windows terminal encoding
sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

# Load your .env.production config
load_dotenv(dotenv_path=".env.production", override=True)

dsn = os.getenv("SENTRY_DSN", "").strip()

if not dsn:
    print("[FAIL] SENTRY_DSN is empty in .env.production!")
    print("       Paste your DSN and try again.")
    sys.exit(1)

print(f"[OK] DSN found: {dsn[:50]}...")
print("[..] Initializing Sentry SDK...")

import sentry_sdk

sentry_sdk.init(
    dsn=dsn,
    traces_sample_rate=1.0,
    environment="test",
)

print("[..] Sending test events to Sentry dashboard...")
print()

# Send a real test exception
try:
    raise ValueError("SmartBILL Sentry Test -- If you see this in Sentry dashboard, it is working correctly!")
except Exception as e:
    event_id = sentry_sdk.capture_exception(e)
    print(f"[OK] Exception event sent! Event ID: {event_id}")

# Send a test info message
msg_id = sentry_sdk.capture_message("SmartBILL Sentry Connection Verified!", level="info")
print(f"[OK] Info message sent!     Event ID: {msg_id}")

# Flush — ensures events are delivered before script exits
print("[..] Flushing events (waiting 5 seconds)...")
sentry_sdk.flush(timeout=5)

print()
print("=" * 60)
print("  DONE! Now check your Sentry Dashboard:")
print("  --> https://sentry.io --> Your Project --> Issues")
print()
print("  You should see:")
print("   1. ValueError: SmartBILL Sentry Test ...")
print("   2. Info: SmartBILL Sentry Connection Verified!")
print()
print("  Seen them? --> Sentry is working perfectly!")
print("  Nothing?   --> Check DSN is pasted correctly in .env")
print("=" * 60)
