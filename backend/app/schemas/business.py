from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class InvoiceStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"


class BusinessIncomeBase(BaseModel):
    invoice_number: str
    client_name: str
    description: Optional[str] = None
    amount: Decimal
    currency: str = "USD"
    date: date
    due_date: Optional[date] = None
    status: InvoiceStatus = InvoiceStatus.draft


class BusinessIncomeCreate(BusinessIncomeBase):
    pass


class BusinessIncomeUpdate(BaseModel):
    invoice_number: Optional[str] = None
    client_name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    date: Optional[date] = None
    due_date: Optional[date] = None
    status: Optional[InvoiceStatus] = None


class BusinessIncomeResponse(BusinessIncomeBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
