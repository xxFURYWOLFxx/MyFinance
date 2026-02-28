from sqlalchemy import Column, Integer, String, Date, Numeric, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class BudgetPeriod(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class AlertType(str, enum.Enum):
    WARNING = "warning"
    EXCEEDED = "exceeded"
    ON_TRACK = "on_track"


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    period = Column(SQLEnum(BudgetPeriod), default=BudgetPeriod.MONTHLY)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    rollover_enabled = Column(Boolean, default=False)
    alert_threshold = Column(Numeric(5, 2), default=80.00)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Budget {self.id}: {self.name} - {self.amount}>"


class BudgetAlert(Base):
    __tablename__ = "budget_alerts"

    id = Column(Integer, primary_key=True, index=True)
    budget_id = Column(Integer, ForeignKey("budgets.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    alert_type = Column(SQLEnum(AlertType), nullable=False)
    message = Column(Text, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<BudgetAlert {self.id}: {self.alert_type}>"
