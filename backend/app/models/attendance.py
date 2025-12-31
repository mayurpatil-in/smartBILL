from sqlalchemy import Column, Integer, Date, String, ForeignKey, Enum, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import date
import enum

from app.database.base import Base

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    LEAVE = "leave"

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    notes = Column(String(255), nullable=True)

    # New Payroll Fields
    overtime_hours = Column(Numeric(4, 2), default=0.00) # e.g. 1.5 hours
    bonus_amount = Column(Numeric(10, 2), default=0.00)  # e.g. 500 rupees
    
    # Relationships
    user = relationship("User", back_populates="attendance_logs")

    # Ensure one attendance record per user per day
    __table_args__ = (
        UniqueConstraint('user_id', 'date', name='unique_user_attendance_per_day'),
    )
