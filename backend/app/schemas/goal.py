from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class GoalStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    paused = "paused"
    cancelled = "cancelled"


class GoalBase(BaseModel):
    name: str
    category: str
    target_amount: Decimal
    current_amount: Decimal = Decimal("0")
    target_date: Optional[date] = None
    monthly_contribution: Decimal = Decimal("0")


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    target_amount: Optional[Decimal] = None
    current_amount: Optional[Decimal] = None
    target_date: Optional[date] = None
    monthly_contribution: Optional[Decimal] = None
    status: Optional[GoalStatus] = None


class GoalResponse(GoalBase):
    id: int
    user_id: int
    status: GoalStatus
    created_at: datetime

    class Config:
        from_attributes = True


class GoalContributionBase(BaseModel):
    goal_id: int
    amount: Decimal
    date: date
    notes: Optional[str] = None


class GoalContributionCreate(GoalContributionBase):
    pass


class GoalContributionResponse(GoalContributionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
