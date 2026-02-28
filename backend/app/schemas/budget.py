from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class BudgetPeriod(str, Enum):
    weekly = "weekly"
    monthly = "monthly"
    yearly = "yearly"


class BudgetBase(BaseModel):
    name: str
    category: str
    amount: Decimal
    period: BudgetPeriod = BudgetPeriod.monthly
    alert_threshold: int = 80  # Percentage


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    period: Optional[BudgetPeriod] = None
    alert_threshold: Optional[int] = None
    is_active: Optional[bool] = None


class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    spent: Decimal = Decimal("0")  # Computed field

    class Config:
        from_attributes = True
