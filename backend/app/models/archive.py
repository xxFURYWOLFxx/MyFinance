from sqlalchemy import Column, Integer, String, Numeric, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.db.base import Base


class MonthlyArchive(Base):
    __tablename__ = "monthly_archive"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    total_income = Column(Numeric(15, 2), default=0)
    total_expenses = Column(Numeric(15, 2), default=0)
    net_saved = Column(Numeric(15, 2), default=0)
    savings_rate = Column(Numeric(5, 2), default=0)
    top_expense_category = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'month', 'year', name='uq_monthly_archive_user_month_year'),
    )

    def __repr__(self):
        return f"<MonthlyArchive {self.id}: {self.month}/{self.year}>"
