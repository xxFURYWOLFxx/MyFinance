from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import Income, User
from app.schemas import IncomeCreate, IncomeUpdate, IncomeResponse, IncomeSummary

router = APIRouter(prefix="/income", tags=["Income"])


@router.get("", response_model=List[IncomeResponse])
def get_income(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all income entries for the current user."""
    query = db.query(Income).filter(Income.user_id == current_user.id)

    if category:
        query = query.filter(Income.category == category)
    if start_date:
        query = query.filter(Income.date >= start_date)
    if end_date:
        query = query.filter(Income.date <= end_date)

    return query.order_by(Income.date.desc()).offset(skip).limit(limit).all()


@router.get("/summary", response_model=IncomeSummary)
def get_income_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get income summary with totals by category."""
    query = db.query(Income).filter(Income.user_id == current_user.id)

    if start_date:
        query = query.filter(Income.date >= start_date)
    if end_date:
        query = query.filter(Income.date <= end_date)

    incomes = query.all()
    total = sum(i.amount for i in incomes)

    by_category = {}
    for income in incomes:
        cat = income.category
        by_category[cat] = by_category.get(cat, Decimal("0")) + income.amount

    return IncomeSummary(total=total, count=len(incomes), by_category=by_category)


@router.get("/{income_id}", response_model=IncomeResponse)
def get_income_by_id(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific income entry."""
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()

    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    return income


@router.post("", response_model=IncomeResponse)
def create_income(
    income_in: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new income entry."""
    income = Income(
        user_id=current_user.id,
        **income_in.model_dump()
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.put("/{income_id}", response_model=IncomeResponse)
def update_income(
    income_id: int,
    income_in: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an income entry."""
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()

    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    for field, value in income_in.model_dump(exclude_unset=True).items():
        setattr(income, field, value)

    db.commit()
    db.refresh(income)
    return income


@router.delete("/{income_id}")
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an income entry."""
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.user_id == current_user.id
    ).first()

    if not income:
        raise HTTPException(status_code=404, detail="Income not found")

    db.delete(income)
    db.commit()
    return {"message": "Income deleted successfully"}
