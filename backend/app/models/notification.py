from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class NotificationType(str, enum.Enum):
    BUDGET_ALERT = "budget_alert"
    GOAL_MILESTONE = "goal_milestone"
    BILL_REMINDER = "bill_reminder"
    SYSTEM = "system"
    INFO = "info"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(SQLEnum(NotificationType), nullable=False, default=NotificationType.INFO)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Notification {self.id}: {self.title}>"
