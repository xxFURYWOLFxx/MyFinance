from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class TransactionType(str, Enum):
    deposit = "deposit"
    withdrawal = "withdrawal"
    transfer = "transfer"
    interest = "interest"


class SavingsAccountBase(BaseModel):
    name: str
    account_type: Optional[str] = None
    institution: Optional[str] = None
    currency: str = "USD"
    initial_balance: Decimal = Decimal("0")


class SavingsAccountCreate(SavingsAccountBase):
    pass


class SavingsAccountUpdate(BaseModel):
    name: Optional[str] = None
    account_type: Optional[str] = None
    institution: Optional[str] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


class SavingsAccountResponse(SavingsAccountBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    balance: Decimal = Decimal("0")  # Computed field

    class Config:
        from_attributes = True


class SavingsTransactionBase(BaseModel):
    account_id: Optional[int] = None
    date: date
    transaction_type: TransactionType
    amount: Decimal
    description: Optional[str] = None
    notes: Optional[str] = None


class SavingsTransactionCreate(SavingsTransactionBase):
    pass


class SavingsTransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    date: Optional[date] = None
    transaction_type: Optional[TransactionType] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class SavingsTransactionResponse(SavingsTransactionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
