from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class RecurringType(str, Enum):
    income = "income"
    expense = "expense"


class RecurringFrequency(str, Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    quarterly = "quarterly"
    yearly = "yearly"


class RecurringTransactionBase(BaseModel):
    name: str
    transaction_type: RecurringType
    category: str
    amount: Decimal
    frequency: RecurringFrequency
    start_date: date
    next_date: date
    end_date: Optional[date] = None


class RecurringTransactionCreate(RecurringTransactionBase):
    pass


class RecurringTransactionUpdate(BaseModel):
    name: Optional[str] = None
    transaction_type: Optional[RecurringType] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    frequency: Optional[RecurringFrequency] = None
    start_date: Optional[date] = None
    next_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class RecurringTransactionResponse(RecurringTransactionBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
