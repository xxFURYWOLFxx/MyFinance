from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class ExpenseBase(BaseModel):
    date: date
    description: str
    category: str
    amount: Decimal
    currency: str = "USD"
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    date: Optional[date] = None
    description: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ExpenseSummary(BaseModel):
    total: Decimal
    count: int
    by_category: dict[str, Decimal]
