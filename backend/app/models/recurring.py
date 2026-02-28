from sqlalchemy import Column, Integer, String, Date, Numeric, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class RecurringType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class RecurringFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    transaction_type = Column(SQLEnum(RecurringType), nullable=False)
    category = Column(String(50), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="USD")
    frequency = Column(SQLEnum(RecurringFrequency), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    next_occurrence = Column(Date, nullable=True, index=True)
    last_generated = Column(Date, nullable=True)
    auto_post = Column(Boolean, default=False)
    reminder_days_before = Column(Integer, default=3)
    is_active = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<RecurringTransaction {self.id}: {self.name} - {self.frequency}>"
