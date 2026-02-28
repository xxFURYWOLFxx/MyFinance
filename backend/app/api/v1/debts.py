from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import Debt, DebtPayment, User
from app.schemas import (
    DebtCreate, DebtUpdate, DebtResponse,
    DebtPaymentCreate, DebtPaymentResponse
)

router = APIRouter(prefix="/debts", tags=["Debts"])


@router.get("", response_model=List[DebtResponse])
def get_debts(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all debts for the current user."""
    query = db.query(Debt).filter(Debt.user_id == current_user.id)

    if not include_inactive:
        query = query.filter(Debt.is_active == True)

    return query.all()


@router.get("/summary")
def get_debt_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get debt summary."""
    debts = db.query(Debt).filter(
        Debt.user_id == current_user.id,
        Debt.is_active == True
    ).all()

    total_balance = sum(d.current_balance for d in debts)
    total_original = sum(d.original_amount for d in debts)
    total_paid = total_original - total_balance
    total_minimum = sum(d.minimum_payment for d in debts)

    # Find highest rate debt
    highest_rate_debt = max(debts, key=lambda d: d.interest_rate) if debts else None

    return {
        "total_balance": total_balance,
        "total_original": total_original,
        "total_paid": total_paid,
        "paid_percent": (total_paid / total_original * 100) if total_original > 0 else Decimal("0"),
        "total_minimum_payment": total_minimum,
        "highest_rate": highest_rate_debt.interest_rate if highest_rate_debt else Decimal("0"),
        "highest_rate_debt_name": highest_rate_debt.name if highest_rate_debt else None,
        "debt_count": len(debts)
    }


@router.get("/{debt_id}", response_model=DebtResponse)
def get_debt_by_id(
    debt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific debt."""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id
    ).first()

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    return debt


@router.post("", response_model=DebtResponse)
def create_debt(
    debt_in: DebtCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new debt."""
    debt = Debt(
        user_id=current_user.id,
        **debt_in.model_dump()
    )
    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt


@router.put("/{debt_id}", response_model=DebtResponse)
def update_debt(
    debt_id: int,
    debt_in: DebtUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a debt."""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id
    ).first()

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    for field, value in debt_in.model_dump(exclude_unset=True).items():
        setattr(debt, field, value)

    db.commit()
    db.refresh(debt)
    return debt


@router.delete("/{debt_id}")
def delete_debt(
    debt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a debt."""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id
    ).first()

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    db.delete(debt)
    db.commit()
    return {"message": "Debt deleted successfully"}


# ============ Payments ============

@router.get("/{debt_id}/payments", response_model=List[DebtPaymentResponse])
def get_debt_payments(
    debt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all payments for a debt."""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id
    ).first()

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    return db.query(DebtPayment).filter(
        DebtPayment.debt_id == debt_id,
        DebtPayment.user_id == current_user.id
    ).order_by(DebtPayment.date.desc()).all()


@router.post("/{debt_id}/payments", response_model=DebtPaymentResponse)
def add_payment(
    debt_id: int,
    payment_in: DebtPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a payment to a debt."""
    debt = db.query(Debt).filter(
        Debt.id == debt_id,
        Debt.user_id == current_user.id
    ).first()

    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")

    payment = DebtPayment(
        user_id=current_user.id,
        debt_id=debt_id,
        amount=payment_in.amount,
        date=payment_in.date,
        notes=payment_in.notes
    )
    db.add(payment)

    # Update debt's current balance
    debt.current_balance = max(Decimal("0"), debt.current_balance - payment_in.amount)

    db.commit()
    db.refresh(payment)
    return payment
