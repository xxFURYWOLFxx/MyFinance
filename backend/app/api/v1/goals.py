from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import Goal, GoalContribution, User
from app.schemas import (
    GoalCreate, GoalUpdate, GoalResponse,
    GoalContributionCreate, GoalContributionResponse
)

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("", response_model=List[GoalResponse])
def get_goals(
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all goals for the current user."""
    query = db.query(Goal).filter(Goal.user_id == current_user.id)

    if status:
        query = query.filter(Goal.status == status)

    return query.order_by(Goal.created_at.desc()).all()


@router.get("/{goal_id}", response_model=GoalResponse)
def get_goal_by_id(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific goal."""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal


@router.post("", response_model=GoalResponse)
def create_goal(
    goal_in: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new goal."""
    goal = Goal(
        user_id=current_user.id,
        **goal_in.model_dump()
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal_in: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a goal."""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    for field, value in goal_in.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a goal."""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}


# ============ Contributions ============

@router.get("/{goal_id}/contributions", response_model=List[GoalContributionResponse])
def get_goal_contributions(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all contributions for a goal."""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return db.query(GoalContribution).filter(
        GoalContribution.goal_id == goal_id,
        GoalContribution.user_id == current_user.id
    ).order_by(GoalContribution.date.desc()).all()


@router.post("/{goal_id}/contributions", response_model=GoalContributionResponse)
def add_contribution(
    goal_id: int,
    contribution_in: GoalContributionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a contribution to a goal."""
    goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    contribution = GoalContribution(
        user_id=current_user.id,
        goal_id=goal_id,
        amount=contribution_in.amount,
        date=contribution_in.date,
        notes=contribution_in.notes
    )
    db.add(contribution)

    # Update goal's current amount
    goal.current_amount = (goal.current_amount or Decimal("0")) + contribution_in.amount

    db.commit()
    db.refresh(contribution)
    return contribution
