from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class DebtType(str, Enum):
    credit_card = "credit_card"
    mortgage = "mortgage"
    auto = "auto"
    student = "student"
    personal = "personal"
    other = "other"


class DebtBase(BaseModel):
    name: str
    debt_type: DebtType
    original_amount: Decimal
    current_balance: Decimal
    interest_rate: Decimal
    minimum_payment: Decimal
    due_day: int = 1  # Day of month


class DebtCreate(DebtBase):
    pass


class DebtUpdate(BaseModel):
    name: Optional[str] = None
    debt_type: Optional[DebtType] = None
    original_amount: Optional[Decimal] = None
    current_balance: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    minimum_payment: Optional[Decimal] = None
    due_day: Optional[int] = None
    is_active: Optional[bool] = None


class DebtResponse(DebtBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DebtPaymentBase(BaseModel):
    debt_id: int
    amount: Decimal
    date: date
    notes: Optional[str] = None


class DebtPaymentCreate(DebtPaymentBase):
    pass


class DebtPaymentResponse(DebtPaymentBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
