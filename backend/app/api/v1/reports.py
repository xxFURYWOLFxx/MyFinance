from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
import calendar

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import Income, Expense, SavingsAccount, SavingsTransaction, User, TransactionType

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
def get_reports_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get summary statistics for reports."""
    today = date.today()
    year_start = today.replace(month=1, day=1)

    if not start_date:
        start_date = year_start
    if not end_date:
        end_date = today

    # Total income
    incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= start_date,
        Income.date <= end_date
    ).all()
    total_income = sum(i.amount for i in incomes)

    # Total expenses
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= start_date,
        Expense.date <= end_date
    ).all()
    total_expenses = sum(e.amount for e in expenses)

    # Net savings
    net_savings = total_income - total_expenses

    # Savings rate
    savings_rate = (net_savings / total_income * 100) if total_income > 0 else Decimal("0")

    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_savings": net_savings,
        "savings_rate": savings_rate,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }


@router.get("/monthly")
def get_monthly_data(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly income and expenses breakdown."""
    if not year:
        year = date.today().year

    monthly_data = []

    for month in range(1, 13):
        month_start = date(year, month, 1)
        month_end = date(year, month, calendar.monthrange(year, month)[1])

        # Income for this month
        incomes = db.query(Income).filter(
            Income.user_id == current_user.id,
            Income.date >= month_start,
            Income.date <= month_end
        ).all()
        month_income = sum(i.amount for i in incomes)

        # Expenses for this month
        expenses = db.query(Expense).filter(
            Expense.user_id == current_user.id,
            Expense.date >= month_start,
            Expense.date <= month_end
        ).all()
        month_expenses = sum(e.amount for e in expenses)

        monthly_data.append({
            "month": calendar.month_abbr[month],
            "month_num": month,
            "income": month_income,
            "expenses": month_expenses,
            "net": month_income - month_expenses,
        })

    return monthly_data


@router.get("/categories")
def get_category_breakdown(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    transaction_type: str = "expense",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get breakdown by category for income or expenses."""
    today = date.today()
    month_start = today.replace(day=1)

    if not start_date:
        start_date = month_start
    if not end_date:
        end_date = today

    if transaction_type == "income":
        items = db.query(Income).filter(
            Income.user_id == current_user.id,
            Income.date >= start_date,
            Income.date <= end_date
        ).all()
    else:
        items = db.query(Expense).filter(
            Expense.user_id == current_user.id,
            Expense.date >= start_date,
            Expense.date <= end_date
        ).all()

    by_category = {}
    for item in items:
        cat = item.category
        by_category[cat] = by_category.get(cat, Decimal("0")) + item.amount

    total = sum(by_category.values()) if by_category else Decimal("1")

    result = []
    for category, amount in sorted(by_category.items(), key=lambda x: x[1], reverse=True):
        result.append({
            "category": category,
            "amount": amount,
            "percentage": (amount / total * 100) if total > 0 else Decimal("0")
        })

    return result


@router.get("/net-worth-history")
def get_net_worth_history(
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get net worth history over time."""
    today = date.today()
    history = []

    for i in range(months - 1, -1, -1):
        # Calculate the date for this month
        target_date = today - timedelta(days=i * 30)
        month_end = target_date.replace(day=calendar.monthrange(target_date.year, target_date.month)[1])

        # Get cumulative savings up to this date
        accounts = db.query(SavingsAccount).filter(
            SavingsAccount.user_id == current_user.id,
            SavingsAccount.is_active == True
        ).all()

        total_savings = Decimal("0")
        for account in accounts:
            balance = account.initial_balance or Decimal("0")
            transactions = db.query(SavingsTransaction).filter(
                SavingsTransaction.account_id == account.id,
                SavingsTransaction.user_id == current_user.id,
                SavingsTransaction.date <= month_end
            ).all()
            for tx in transactions:
                if tx.transaction_type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                    balance += tx.amount
                elif tx.transaction_type == TransactionType.WITHDRAWAL:
                    balance -= tx.amount
            total_savings += balance

        history.append({
            "month": calendar.month_abbr[target_date.month],
            "year": target_date.year,
            "net_worth": total_savings,
        })

    return history


@router.get("/cash-flow")
def get_cash_flow(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get cash flow data for recent months."""
    today = date.today()
    cash_flow = []

    for i in range(months - 1, -1, -1):
        target_date = today - timedelta(days=i * 30)
        month_start = target_date.replace(day=1)
        month_end = target_date.replace(day=calendar.monthrange(target_date.year, target_date.month)[1])

        # Income
        incomes = db.query(Income).filter(
            Income.user_id == current_user.id,
            Income.date >= month_start,
            Income.date <= month_end
        ).all()
        month_income = sum(i.amount for i in incomes)

        # Expenses
        expenses = db.query(Expense).filter(
            Expense.user_id == current_user.id,
            Expense.date >= month_start,
            Expense.date <= month_end
        ).all()
        month_expenses = sum(e.amount for e in expenses)

        cash_flow.append({
            "month": calendar.month_abbr[target_date.month],
            "year": target_date.year,
            "inflow": month_income,
            "outflow": month_expenses,
            "net_flow": month_income - month_expenses,
        })

    return cash_flow


@router.get("/year-comparison")
def get_year_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compare current year with previous year."""
    today = date.today()
    current_year = today.year
    last_year = current_year - 1

    # Current year data
    current_year_start = date(current_year, 1, 1)
    current_incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= current_year_start,
        Income.date <= today
    ).all()
    current_income = sum(i.amount for i in current_incomes)

    current_expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= current_year_start,
        Expense.date <= today
    ).all()
    current_expense = sum(e.amount for e in current_expenses)

    # Last year same period data
    last_year_start = date(last_year, 1, 1)
    last_year_end = date(last_year, today.month, min(today.day, calendar.monthrange(last_year, today.month)[1]))

    last_incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= last_year_start,
        Income.date <= last_year_end
    ).all()
    last_income = sum(i.amount for i in last_incomes)

    last_expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= last_year_start,
        Expense.date <= last_year_end
    ).all()
    last_expense = sum(e.amount for e in last_expenses)

    income_change = ((current_income - last_income) / last_income * 100) if last_income > 0 else Decimal("0")
    expense_change = ((current_expense - last_expense) / last_expense * 100) if last_expense > 0 else Decimal("0")

    return {
        "current_year": current_year,
        "last_year": last_year,
        "current_income": current_income,
        "last_income": last_income,
        "income_change": income_change,
        "current_expenses": current_expense,
        "last_expenses": last_expense,
        "expense_change": expense_change,
        "current_net": current_income - current_expense,
        "last_net": last_income - last_expense,
    }
