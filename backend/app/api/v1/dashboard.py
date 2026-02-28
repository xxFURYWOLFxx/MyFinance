from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date, timedelta
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import Income, Expense, SavingsAccount, SavingsTransaction, Goal, User, TransactionType

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard summary for the current user."""
    today = date.today()
    month_start = today.replace(day=1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)
    last_month_end = month_start - timedelta(days=1)

    # Current month income
    current_income = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= month_start,
        Income.date <= today
    ).all()
    total_income = sum(i.amount for i in current_income)

    # Last month income for comparison
    last_month_income = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= last_month_start,
        Income.date <= last_month_end
    ).all()
    last_income = sum(i.amount for i in last_month_income)

    # Current month expenses
    current_expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= month_start,
        Expense.date <= today
    ).all()
    total_expenses = sum(e.amount for e in current_expenses)

    # Last month expenses for comparison
    last_month_expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= last_month_start,
        Expense.date <= last_month_end
    ).all()
    last_expenses = sum(e.amount for e in last_month_expenses)

    # Calculate savings (from savings accounts)
    accounts = db.query(SavingsAccount).filter(
        SavingsAccount.user_id == current_user.id,
        SavingsAccount.is_active == True
    ).all()

    total_savings = Decimal("0")
    for account in accounts:
        balance = account.initial_balance or Decimal("0")
        transactions = db.query(SavingsTransaction).filter(
            SavingsTransaction.account_id == account.id,
            SavingsTransaction.user_id == current_user.id
        ).all()
        for tx in transactions:
            if tx.transaction_type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                balance += tx.amount
            elif tx.transaction_type == TransactionType.WITHDRAWAL:
                balance -= tx.amount
        total_savings += balance

    # Net worth (simplified: savings - debts would need debt table)
    net_worth = total_savings

    # Goals progress
    goals = db.query(Goal).filter(
        Goal.user_id == current_user.id,
        Goal.status == "active"
    ).all()
    goals_progress = len([g for g in goals if g.current_amount >= g.target_amount]) / len(goals) * 100 if goals else 0

    # Calculate percentage changes
    income_change = ((total_income - last_income) / last_income * 100) if last_income > 0 else Decimal("0")
    expense_change = ((total_expenses - last_expenses) / last_expenses * 100) if last_expenses > 0 else Decimal("0")

    return {
        "total_income": total_income,
        "income_change": income_change,
        "total_expenses": total_expenses,
        "expense_change": expense_change,
        "total_savings": total_savings,
        "net_worth": net_worth,
        "goals_progress": goals_progress,
        "active_goals": len(goals)
    }


@router.get("/expenses-by-category")
def get_expenses_by_category(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get expense breakdown by category for the current month."""
    today = date.today()
    month_start = today.replace(day=1)

    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= month_start,
        Expense.date <= today
    ).all()

    by_category = {}
    for expense in expenses:
        cat = expense.category
        by_category[cat] = by_category.get(cat, Decimal("0")) + expense.amount

    total = sum(by_category.values())

    result = []
    for category, amount in sorted(by_category.items(), key=lambda x: x[1], reverse=True):
        result.append({
            "category": category,
            "amount": amount,
            "percentage": (amount / total * 100) if total > 0 else Decimal("0")
        })

    return result


@router.get("/recent-transactions")
def get_recent_transactions(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get recent transactions (income and expenses combined)."""
    incomes = db.query(Income).filter(
        Income.user_id == current_user.id
    ).order_by(Income.date.desc()).limit(limit).all()

    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id
    ).order_by(Expense.date.desc()).limit(limit).all()

    transactions = []

    for income in incomes:
        transactions.append({
            "id": income.id,
            "type": "income",
            "description": income.source,
            "category": income.category,
            "amount": income.amount,
            "date": income.date.isoformat(),
        })

    for expense in expenses:
        transactions.append({
            "id": expense.id,
            "type": "expense",
            "description": expense.description,
            "category": expense.category,
            "amount": expense.amount,
            "date": expense.date.isoformat(),
        })

    # Sort by date and limit
    transactions.sort(key=lambda x: x["date"], reverse=True)
    return transactions[:limit]
