from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date, timedelta
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import Budget, Expense, User
from app.schemas import BudgetCreate, BudgetUpdate, BudgetResponse

router = APIRouter(prefix="/budgets", tags=["Budgets"])


def calculate_budget_spent(db: Session, budget: Budget, user_id: int) -> Decimal:
    """Calculate how much has been spent against a budget."""
    today = date.today()

    # Determine date range based on budget period
    if budget.period.value == "weekly":
        start_date = today - timedelta(days=today.weekday())
    elif budget.period.value == "monthly":
        start_date = today.replace(day=1)
    else:  # yearly
        start_date = today.replace(month=1, day=1)

    spent = db.query(Expense).filter(
        Expense.user_id == user_id,
        Expense.category == budget.category,
        Expense.date >= start_date,
        Expense.date <= today
    ).all()

    return sum(e.amount for e in spent)


@router.get("", response_model=List[BudgetResponse])
def get_budgets(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all budgets for the current user."""
    query = db.query(Budget).filter(Budget.user_id == current_user.id)

    if not include_inactive:
        query = query.filter(Budget.is_active == True)

    budgets = query.all()

    result = []
    for budget in budgets:
        spent = calculate_budget_spent(db, budget, current_user.id)
        result.append(BudgetResponse(
            id=budget.id,
            user_id=budget.user_id,
            name=budget.name,
            category=budget.category,
            amount=budget.amount,
            period=budget.period,
            alert_threshold=budget.alert_threshold,
            is_active=budget.is_active,
            created_at=budget.created_at,
            spent=spent
        ))

    return result


@router.get("/{budget_id}", response_model=BudgetResponse)
def get_budget_by_id(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific budget."""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    spent = calculate_budget_spent(db, budget, current_user.id)

    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        name=budget.name,
        category=budget.category,
        amount=budget.amount,
        period=budget.period,
        alert_threshold=budget.alert_threshold,
        is_active=budget.is_active,
        created_at=budget.created_at,
        spent=spent
    )


@router.post("", response_model=BudgetResponse)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new budget."""
    budget = Budget(
        user_id=current_user.id,
        start_date=date.today().replace(day=1),  # Default to first of current month
        **budget_in.model_dump()
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)

    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        name=budget.name,
        category=budget.category,
        amount=budget.amount,
        period=budget.period,
        alert_threshold=budget.alert_threshold,
        is_active=budget.is_active,
        created_at=budget.created_at,
        spent=Decimal("0")
    )


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a budget."""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    for field, value in budget_in.model_dump(exclude_unset=True).items():
        setattr(budget, field, value)

    db.commit()
    db.refresh(budget)

    spent = calculate_budget_spent(db, budget, current_user.id)

    return BudgetResponse(
        id=budget.id,
        user_id=budget.user_id,
        name=budget.name,
        category=budget.category,
        amount=budget.amount,
        period=budget.period,
        alert_threshold=budget.alert_threshold,
        is_active=budget.is_active,
        created_at=budget.created_at,
        spent=spent
    )


@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a budget."""
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id
    ).first()

    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted successfully"}
