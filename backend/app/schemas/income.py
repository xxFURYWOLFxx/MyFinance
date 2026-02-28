from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class IncomeBase(BaseModel):
    date: date
    source: str
    category: str
    amount: Decimal
    currency: str = "USD"
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class IncomeCreate(IncomeBase):
    pass


class IncomeUpdate(BaseModel):
    date: Optional[date] = None
    source: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class IncomeResponse(IncomeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IncomeSummary(BaseModel):
    total: Decimal
    count: int
    by_category: dict[str, Decimal]
