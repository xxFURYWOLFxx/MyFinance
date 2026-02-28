from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import User, Income, Expense, Goal, Budget, InvestmentHolding, Debt, RecurringTransaction

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("")
def global_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Global search across all user data."""
    results = []
    search_term = f"%{q.lower()}%"

    # Search Income
    incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        or_(
            Income.source.ilike(search_term),
            Income.description.ilike(search_term),
            Income.category.ilike(search_term)
        )
    ).limit(limit).all()

    for item in incomes:
        results.append({
            "id": item.id,
            "type": "income",
            "title": item.source,
            "description": item.description,
            "amount": float(item.amount),
            "date": str(item.date),
            "category": item.category
        })

    # Search Expenses
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        or_(
            Expense.description.ilike(search_term),
            Expense.category.ilike(search_term),
            Expense.vendor.ilike(search_term) if hasattr(Expense, 'vendor') else False
        )
    ).limit(limit).all()

    for item in expenses:
        results.append({
            "id": item.id,
            "type": "expense",
            "title": item.description,
            "description": item.category,
            "amount": float(item.amount),
            "date": str(item.date),
            "category": item.category
        })

    # Search Goals
    goals = db.query(Goal).filter(
        Goal.user_id == current_user.id,
        or_(
            Goal.name.ilike(search_term),
            Goal.description.ilike(search_term) if hasattr(Goal, 'description') else False
        )
    ).limit(limit).all()

    for item in goals:
        results.append({
            "id": item.id,
            "type": "goal",
            "title": item.name,
            "description": getattr(item, 'description', None),
            "amount": float(item.target_amount),
            "category": item.category
        })

    # Search Budgets
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        or_(
            Budget.name.ilike(search_term),
            Budget.category.ilike(search_term)
        )
    ).limit(limit).all()

    for item in budgets:
        results.append({
            "id": item.id,
            "type": "budget",
            "title": item.name,
            "description": item.category,
            "amount": float(item.amount),
            "category": item.category
        })

    # Search Investments
    investments = db.query(InvestmentHolding).filter(
        InvestmentHolding.user_id == current_user.id,
        or_(
            InvestmentHolding.name.ilike(search_term),
            InvestmentHolding.symbol.ilike(search_term) if hasattr(InvestmentHolding, 'symbol') else False,
            InvestmentHolding.investment_type.ilike(search_term) if hasattr(InvestmentHolding, 'investment_type') else False
        )
    ).limit(limit).all()

    for item in investments:
        results.append({
            "id": item.id,
            "type": "investment",
            "title": item.name,
            "description": getattr(item, 'symbol', None),
            "amount": float(item.current_value) if hasattr(item, 'current_value') else None,
            "category": getattr(item, 'investment_type', 'investment')
        })

    # Search Debts
    debts = db.query(Debt).filter(
        Debt.user_id == current_user.id,
        or_(
            Debt.name.ilike(search_term),
            Debt.lender.ilike(search_term) if hasattr(Debt, 'lender') else False,
            Debt.debt_type.ilike(search_term) if hasattr(Debt, 'debt_type') else False
        )
    ).limit(limit).all()

    for item in debts:
        results.append({
            "id": item.id,
            "type": "debt",
            "title": item.name,
            "description": getattr(item, 'lender', None),
            "amount": float(item.current_balance) if hasattr(item, 'current_balance') else float(item.original_amount),
            "category": getattr(item, 'debt_type', 'debt')
        })

    # Search Recurring Transactions
    recurring = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id,
        RecurringTransaction.name.ilike(search_term)
    ).limit(limit).all()

    for item in recurring:
        results.append({
            "id": item.id,
            "type": "recurring",
            "title": item.name,
            "description": f"{item.frequency.value} {item.transaction_type.value}",
            "amount": float(item.amount),
            "category": item.category
        })

    # Sort by relevance (items with query in title first)
    results.sort(key=lambda x: (
        0 if q.lower() in x['title'].lower() else 1,
        x['type']
    ))

    # Limit total results
    results = results[:limit]

    return {
        "results": results,
        "total": len(results)
    }
