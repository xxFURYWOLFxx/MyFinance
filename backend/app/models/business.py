from sqlalchemy import Column, Integer, String, Date, Numeric, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class InvoiceStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    PARTIAL = "partial"
    CANCELLED = "cancelled"


class BusinessIncome(Base):
    __tablename__ = "business_income"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    client = Column(String(100), nullable=False)
    invoice_number = Column(String(50), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(SQLEnum(InvoiceStatus), default=InvoiceStatus.PENDING)
    date_paid = Column(Date, nullable=True)
    payment_method = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<BusinessIncome {self.id}: {self.client} - {self.amount}>"
