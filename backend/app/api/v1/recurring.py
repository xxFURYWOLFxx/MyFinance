from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import RecurringTransaction, User
from app.schemas import (
    RecurringTransactionCreate, RecurringTransactionUpdate, RecurringTransactionResponse
)

router = APIRouter(prefix="/recurring", tags=["Recurring"])


@router.get("", response_model=List[RecurringTransactionResponse])
def get_recurring_transactions(
    transaction_type: Optional[str] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all recurring transactions for the current user."""
    query = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id
    )

    if transaction_type:
        query = query.filter(RecurringTransaction.transaction_type == transaction_type)

    if not include_inactive:
        query = query.filter(RecurringTransaction.is_active == True)

    return query.order_by(RecurringTransaction.next_occurrence).all()


@router.get("/summary")
def get_recurring_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recurring transactions summary."""
    transactions = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id,
        RecurringTransaction.is_active == True
    ).all()

    monthly_income = sum(
        t.amount for t in transactions
        if t.transaction_type.value == "income" and t.frequency.value == "monthly"
    )
    monthly_expenses = sum(
        t.amount for t in transactions
        if t.transaction_type.value == "expense" and t.frequency.value == "monthly"
    )

    # Convert weekly/biweekly to monthly estimates
    for t in transactions:
        if t.frequency.value == "weekly":
            multiplier = Decimal("4.33")
        elif t.frequency.value == "biweekly":
            multiplier = Decimal("2.17")
        elif t.frequency.value == "quarterly":
            multiplier = Decimal("0.33")
        elif t.frequency.value == "yearly":
            multiplier = Decimal("0.083")
        else:
            continue

        if t.transaction_type.value == "income":
            monthly_income += t.amount * multiplier
        else:
            monthly_expenses += t.amount * multiplier

    return {
        "monthly_income": monthly_income,
        "monthly_expenses": monthly_expenses,
        "net_monthly": monthly_income - monthly_expenses,
        "income_count": len([t for t in transactions if t.transaction_type.value == "income"]),
        "expense_count": len([t for t in transactions if t.transaction_type.value == "expense"])
    }


@router.get("/{recurring_id}", response_model=RecurringTransactionResponse)
def get_recurring_by_id(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific recurring transaction."""
    recurring = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id,
        RecurringTransaction.user_id == current_user.id
    ).first()

    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    return recurring


@router.post("", response_model=RecurringTransactionResponse)
def create_recurring(
    recurring_in: RecurringTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new recurring transaction."""
    recurring = RecurringTransaction(
        user_id=current_user.id,
        **recurring_in.model_dump()
    )
    db.add(recurring)
    db.commit()
    db.refresh(recurring)
    return recurring


@router.put("/{recurring_id}", response_model=RecurringTransactionResponse)
def update_recurring(
    recurring_id: int,
    recurring_in: RecurringTransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a recurring transaction."""
    recurring = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id,
        RecurringTransaction.user_id == current_user.id
    ).first()

    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    for field, value in recurring_in.model_dump(exclude_unset=True).items():
        setattr(recurring, field, value)

    db.commit()
    db.refresh(recurring)
    return recurring


@router.delete("/{recurring_id}")
def delete_recurring(
    recurring_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a recurring transaction."""
    recurring = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id,
        RecurringTransaction.user_id == current_user.id
    ).first()

    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    db.delete(recurring)
    db.commit()
    return {"message": "Recurring transaction deleted successfully"}
