from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional
import calendar

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import Income, Expense, SavingsAccount, SavingsTransaction, Goal, User, TransactionType

router = APIRouter(prefix="/forecasting", tags=["Forecasting"])


@router.get("/summary")
def get_forecast_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get forecasting summary data."""
    today = date.today()

    # Calculate average monthly income and expenses (last 6 months)
    six_months_ago = today - timedelta(days=180)

    incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= six_months_ago
    ).all()
    avg_monthly_income = sum(i.amount for i in incomes) / 6 if incomes else Decimal("0")

    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= six_months_ago
    ).all()
    avg_monthly_expenses = sum(e.amount for e in expenses) / 6 if expenses else Decimal("0")

    # Calculate current balance (savings accounts)
    accounts = db.query(SavingsAccount).filter(
        SavingsAccount.user_id == current_user.id,
        SavingsAccount.is_active == True
    ).all()

    current_balance = Decimal("0")
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
        current_balance += balance

    # Calculate monthly savings and projected balance
    monthly_savings = avg_monthly_income - avg_monthly_expenses
    projected_12mo = current_balance + (monthly_savings * 12)

    # Savings rate
    savings_rate = (monthly_savings / avg_monthly_income * 100) if avg_monthly_income > 0 else Decimal("0")

    # Get active goal and calculate time to reach it
    active_goal = db.query(Goal).filter(
        Goal.user_id == current_user.id,
        Goal.status == "active"
    ).first()

    time_to_goal = 0
    goal_target = Decimal("0")
    if active_goal and monthly_savings > 0:
        remaining = active_goal.target_amount - active_goal.current_amount
        time_to_goal = int(remaining / monthly_savings) if remaining > 0 else 0
        goal_target = active_goal.target_amount

    return {
        "current_balance": current_balance,
        "projected_balance": projected_12mo,
        "monthly_income": avg_monthly_income,
        "monthly_expenses": avg_monthly_expenses,
        "monthly_savings": monthly_savings,
        "savings_rate": savings_rate,
        "time_to_goal": time_to_goal,
        "goal_target": goal_target,
    }


@router.get("/projection")
def get_monthly_projection(
    months: int = 12,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly balance projection."""
    today = date.today()

    # Calculate average monthly savings (last 6 months)
    six_months_ago = today - timedelta(days=180)

    incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= six_months_ago
    ).all()
    avg_monthly_income = sum(i.amount for i in incomes) / 6 if incomes else Decimal("0")

    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= six_months_ago
    ).all()
    avg_monthly_expenses = sum(e.amount for e in expenses) / 6 if expenses else Decimal("0")

    monthly_savings = avg_monthly_income - avg_monthly_expenses

    # Get current balance
    accounts = db.query(SavingsAccount).filter(
        SavingsAccount.user_id == current_user.id,
        SavingsAccount.is_active == True
    ).all()

    current_balance = Decimal("0")
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
        current_balance += balance

    # Generate projections
    projections = []
    running_balance = current_balance

    for i in range(months):
        target_month = (today.month + i - 1) % 12 + 1
        target_year = today.year + ((today.month + i - 1) // 12)

        projections.append({
            "month": calendar.month_abbr[target_month],
            "year": target_year,
            "balance": running_balance,
            "projected_income": avg_monthly_income,
            "projected_expenses": avg_monthly_expenses,
        })

        running_balance += monthly_savings

    return projections


@router.get("/insights")
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-style insights and recommendations."""
    today = date.today()
    insights = []

    # Calculate average monthly data
    six_months_ago = today - timedelta(days=180)
    three_months_ago = today - timedelta(days=90)

    # Get monthly averages
    incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= six_months_ago
    ).all()
    avg_monthly_income = sum(i.amount for i in incomes) / 6 if incomes else Decimal("0")

    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= six_months_ago
    ).all()
    avg_monthly_expenses = sum(e.amount for e in expenses) / 6 if expenses else Decimal("0")

    monthly_savings = avg_monthly_income - avg_monthly_expenses

    # Insight 1: Goal projection
    active_goal = db.query(Goal).filter(
        Goal.user_id == current_user.id,
        Goal.status == "active"
    ).first()

    if active_goal and monthly_savings > 0:
        remaining = active_goal.target_amount - active_goal.current_amount
        months_to_goal = int(remaining / monthly_savings) if remaining > 0 else 0
        if months_to_goal > 0:
            target_date = today + timedelta(days=months_to_goal * 30)
            insights.append({
                "type": "positive",
                "message": f"At current rate, you'll reach your goal of ${active_goal.target_amount:,.0f} by {target_date.strftime('%B %Y')}"
            })

    # Insight 2: Spending comparison by category
    recent_expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= three_months_ago
    ).all()

    if recent_expenses:
        category_totals = {}
        for exp in recent_expenses:
            category_totals[exp.category] = category_totals.get(exp.category, Decimal("0")) + exp.amount

        # Find highest spending category
        if category_totals:
            top_category = max(category_totals.items(), key=lambda x: x[1])
            total_spending = sum(category_totals.values())
            percentage = (top_category[1] / total_spending * 100) if total_spending > 0 else 0
            if percentage > 30:
                insights.append({
                    "type": "warning",
                    "message": f"Your {top_category[0]} spending is {percentage:.0f}% of total expenses"
                })

    # Insight 3: Savings improvement tip
    if monthly_savings > 0:
        extra_savings = Decimal("200")
        current_months = 24
        new_months = int((current_months * monthly_savings) / (monthly_savings + extra_savings))
        months_saved = current_months - new_months
        if months_saved > 0:
            insights.append({
                "type": "tip",
                "message": f"Increasing savings by ${extra_savings}/month would cut your goal time by {months_saved} months"
            })
    elif monthly_savings <= 0:
        insights.append({
            "type": "warning",
            "message": "Your expenses exceed your income. Consider reviewing your spending habits."
        })

    # Insight 4: Savings rate
    if avg_monthly_income > 0:
        savings_rate = (monthly_savings / avg_monthly_income * 100)
        if savings_rate >= 20:
            insights.append({
                "type": "positive",
                "message": f"Great job! Your {savings_rate:.0f}% savings rate is above the recommended 20%"
            })
        elif savings_rate > 0:
            insights.append({
                "type": "tip",
                "message": f"Your savings rate is {savings_rate:.0f}%. Aim for at least 20% for financial security"
            })

    return insights


@router.post("/scenario")
def calculate_scenario(
    monthly_income: Decimal,
    monthly_expenses: Decimal,
    savings_goal: Decimal,
    timeframe_months: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate what-if scenario."""
    # Get current balance
    accounts = db.query(SavingsAccount).filter(
        SavingsAccount.user_id == current_user.id,
        SavingsAccount.is_active == True
    ).all()

    current_balance = Decimal("0")
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
        current_balance += balance

    monthly_savings = monthly_income - monthly_expenses
    savings_rate = (monthly_savings / monthly_income * 100) if monthly_income > 0 else Decimal("0")

    # Calculate time to goal
    remaining = savings_goal - current_balance
    if monthly_savings > 0 and remaining > 0:
        time_to_goal = int(remaining / monthly_savings)
    elif remaining <= 0:
        time_to_goal = 0
    else:
        time_to_goal = -1  # Cannot reach goal

    # Can we reach goal in timeframe?
    projected_at_timeframe = current_balance + (monthly_savings * timeframe_months)
    goal_achievable = projected_at_timeframe >= savings_goal

    return {
        "current_balance": current_balance,
        "monthly_savings": monthly_savings,
        "savings_rate": savings_rate,
        "time_to_goal": time_to_goal,
        "projected_at_timeframe": projected_at_timeframe,
        "goal_achievable": goal_achievable,
        "shortfall": max(Decimal("0"), savings_goal - projected_at_timeframe),
    }
