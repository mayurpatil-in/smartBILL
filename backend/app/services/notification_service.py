"""
notification_service.py
=======================
Reusable service for creating company-scoped in-app notifications.

Usage (from any router or service):
    from app.services.notification_service import create_notification

    create_notification(
        db, company_id,
        title="Low Stock: Widget A",
        message="Only 3 units remaining.",
        type="warning"
    )

Notification types:
    "info"    — blue  — general information
    "success" — green — something good happened (backup, payment received)
    "warning" — amber — needs attention (low stock, expiring subscription)
    "error"   — red   — urgent action required (overdue invoices, backup failure)
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.notification import Notification


def create_notification(
    db: Session,
    company_id: int | None,
    title: str,
    message: str,
    type: str = "info",
    user_id: int | None = None,
    dedup_seconds: int = 60,
) -> Notification | None:
    """
    Write a notification row to the DB with built-in deduplication.

    Args:
        db:             Active SQLAlchemy session.
        company_id:     Company to scope this notification to. None = global.
        title:          Short notification title (shown in bell dropdown).
        message:        Longer description text.
        type:           One of "info", "success", "warning", "error".
        user_id:        Optional — scope to a specific user within the company.
        dedup_seconds:  Skip creating if an identical title+type+company
                        notification was created within this many seconds.
                        Default 60s prevents duplicate rapid-fire notifications.

    Returns:
        The created Notification object, or None if deduplicated/skipped.
    """
    try:
        # --- Deduplication check ---
        cutoff = datetime.utcnow() - timedelta(seconds=dedup_seconds)
        existing = db.query(Notification).filter(
            Notification.company_id == company_id,
            Notification.title == title,
            Notification.type == type,
            Notification.created_at >= cutoff,
        ).first()

        if existing:
            return None  # Skip duplicate within dedup window

        # --- Create new notification ---
        notif = Notification(
            company_id=company_id,
            user_id=user_id,
            title=title,
            message=message,
            type=type,
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    except Exception as e:
        db.rollback()
        # Non-fatal: notifications should never break the main business flow
        print(f"[NotificationService] Failed to create notification '{title}': {e}")
        return None


def create_notification_raw(
    db: Session,
    company_id: int | None,
    title: str,
    message: str,
    type: str = "info",
    user_id: int | None = None,
) -> None:
    """
    Lighter version for use inside scheduled background jobs (backup_service, etc.)
    where the db session is managed externally. Does NOT commit — caller must commit.
    Includes deduplication with a 60-second window.
    """
    try:
        cutoff = datetime.utcnow() - timedelta(seconds=60)
        existing = db.query(Notification).filter(
            Notification.company_id == company_id,
            Notification.title == title,
            Notification.type == type,
            Notification.created_at >= cutoff,
        ).first()

        if existing:
            return

        notif = Notification(
            company_id=company_id,
            user_id=user_id,
            title=title,
            message=message,
            type=type,
        )
        db.add(notif)
        # Caller must call db.commit()
    except Exception as e:
        print(f"[NotificationService] Failed to queue notification '{title}': {e}")
