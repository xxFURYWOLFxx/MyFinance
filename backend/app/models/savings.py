from sqlalchemy import Column, Integer, String, Date, Numeric, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class TransactionType(str, enum.Enum):
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    TRANSFER = "transfer"
    INTEREST = "interest"


class SavingsAccount(Base):
    __tablename__ = "savings_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    account_type = Column(String(50), nullable=True)
    institution = Column(String(100), nullable=True)
    currency = Column(String(3), default="USD")
    initial_balance = Column(Numeric(15, 2), default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<SavingsAccount {self.id}: {self.name}>"


class SavingsTransaction(Base):
    __tablename__ = "savings_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("savings_accounts.id", ondelete="CASCADE"), nullable=True)
    date = Column(Date, nullable=False, index=True)
    transaction_type = Column(SQLEnum(TransactionType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<SavingsTransaction {self.id}: {self.transaction_type} - {self.amount}>"
