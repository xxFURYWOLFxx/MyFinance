from sqlalchemy import Column, Integer, String, Date, Numeric, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.db.base import Base


class Debt(Base):
    __tablename__ = "debts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    debt_type = Column(String(50), nullable=True)
    creditor = Column(String(100), nullable=True)
    original_amount = Column(Numeric(15, 2), nullable=False)
    current_balance = Column(Numeric(15, 2), nullable=False)
    interest_rate = Column(Numeric(5, 2), nullable=True)
    minimum_payment = Column(Numeric(15, 2), nullable=True)
    due_day = Column(Integer, nullable=True)
    currency = Column(String(3), default="USD")
    start_date = Column(Date, nullable=True)
    expected_payoff_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Debt {self.id}: {self.name} - {self.current_balance}>"


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id = Column(Integer, primary_key=True, index=True)
    debt_id = Column(Integer, ForeignKey("debts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    principal_amount = Column(Numeric(15, 2), nullable=True)
    interest_amount = Column(Numeric(15, 2), nullable=True)
    date = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<DebtPayment {self.id}: {self.amount}>"
