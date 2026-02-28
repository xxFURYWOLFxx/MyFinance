from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
from pydantic import BaseModel

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import User, Notification, NotificationType, Budget, Goal, RecurringTransaction, Income, Expense, SavingsAccount, SavingsTransaction, TransactionType

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: int
    notification_type: str
    title: str
    message: Optional[str]
    link: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user notifications."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = query.order_by(desc(Notification.created_at)).limit(limit).all()

    # Also generate dynamic notifications based on current state
    dynamic_notifications = generate_dynamic_notifications(db, current_user)

    # Combine and sort
    all_notifications = list(notifications) + dynamic_notifications
    all_notifications.sort(key=lambda x: x.created_at if hasattr(x, 'created_at') else x['created_at'], reverse=True)

    return all_notifications[:limit]


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()

    # Add dynamic notification count
    dynamic = generate_dynamic_notifications(db, current_user)
    dynamic_count = len(dynamic)

    return {"count": count + dynamic_count}


@router.put("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()

    return {"message": "Notification marked as read"}


@router.put("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()

    return {"message": "All notifications marked as read"}


@router.delete("/{notification_id}")
def dismiss_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dismiss/delete a notification."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"message": "Notification dismissed"}


def generate_dynamic_notifications(db: Session, user: User) -> List[dict]:
    """Generate real-time notifications based on current data state."""
    notifications = []
    now = datetime.utcnow()
    today = date.today()

    # --- Budget Alerts (90%+ utilization) ---
    budgets = db.query(Budget).filter(
        Budget.user_id == user.id,
        Budget.is_active == True
    ).all()

    for budget in budgets:
        if hasattr(budget, 'spent') and budget.spent:
            percentage = (float(budget.spent) / float(budget.amount)) * 100 if budget.amount else 0
            if percentage >= 90:
                notifications.append({
                    "id": -budget.id,
                    "notification_type": "budget_alert",
                    "title": f"Budget Alert: {budget.name}",
                    "message": f"You've used {percentage:.0f}% of your {budget.name} budget",
                    "link": "/budgets",
                    "is_read": False,
                    "created_at": now
                })

    # --- Goal Milestones (90-99% progress) ---
    goals = db.query(Goal).filter(
        Goal.user_id == user.id,
        Goal.status == "active"
    ).all()

    for goal in goals:
        if hasattr(goal, 'current_amount') and goal.current_amount and goal.target_amount:
            percentage = (float(goal.current_amount) / float(goal.target_amount)) * 100
            if 90 <= percentage < 100:
                notifications.append({
                    "id": -goal.id - 10000,
                    "notification_type": "goal_milestone",
                    "title": f"Almost there! {goal.name}",
                    "message": f"You're {percentage:.0f}% towards your goal!",
                    "link": "/goals",
                    "is_read": False,
                    "created_at": now
                })

    # --- Upcoming Recurring Transactions (within 3 days) ---
    upcoming_date = today + timedelta(days=3)
    recurring = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == user.id,
        RecurringTransaction.is_active == True,
        RecurringTransaction.next_occurrence != None,
        RecurringTransaction.next_occurrence <= upcoming_date
    ).all()

    for item in recurring:
        notifications.append({
            "id": -item.id - 20000,
            "notification_type": "bill_reminder",
            "title": f"Upcoming: {item.name}",
            "message": f"Due on {item.next_occurrence}",
            "link": "/recurring",
            "is_read": False,
            "created_at": now
        })

    # --- Spending Insights ---
    thirty_days_ago = today - timedelta(days=30)
    recent_expenses = db.query(Expense).filter(
        Expense.user_id == user.id,
        Expense.date >= thirty_days_ago
    ).all()

    recent_incomes = db.query(Income).filter(
        Income.user_id == user.id,
        Income.date >= thirty_days_ago
    ).all()

    total_expenses = sum(float(e.amount) for e in recent_expenses)
    total_income = sum(float(i.amount) for i in recent_incomes)

    # Alert: Expenses exceed income this month
    if total_expenses > 0 and total_income > 0 and total_expenses > total_income:
        overspend = total_expenses - total_income
        notifications.append({
            "id": -30001,
            "notification_type": "budget_alert",
            "title": "Spending exceeds income",
            "message": f"You've spent ${overspend:,.2f} more than you earned this month",
            "link": "/expenses",
            "is_read": False,
            "created_at": now - timedelta(hours=2)
        })

    # Insight: High spending category
    if recent_expenses:
        category_totals = {}
        for exp in recent_expenses:
            cat = exp.category or "Other"
            category_totals[cat] = category_totals.get(cat, 0) + float(exp.amount)
        if category_totals and total_expenses > 0:
            top_cat, top_amount = max(category_totals.items(), key=lambda x: x[1])
            pct = (top_amount / total_expenses) * 100
            if pct > 40:
                notifications.append({
                    "id": -30002,
                    "notification_type": "info",
                    "title": f"Top spending: {top_cat}",
                    "message": f"{top_cat} is {pct:.0f}% of your expenses (${top_amount:,.2f})",
                    "link": "/expenses",
                    "is_read": False,
                    "created_at": now - timedelta(hours=4)
                })

    # --- Savings Account Activity ---
    savings_accounts = db.query(SavingsAccount).filter(
        SavingsAccount.user_id == user.id,
        SavingsAccount.is_active == True
    ).all()

    total_savings = Decimal("0")
    for account in savings_accounts:
        balance = account.initial_balance or Decimal("0")
        transactions = db.query(SavingsTransaction).filter(
            SavingsTransaction.account_id == account.id,
            SavingsTransaction.user_id == user.id
        ).all()
        for tx in transactions:
            if tx.transaction_type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
                balance += tx.amount
            elif tx.transaction_type == TransactionType.WITHDRAWAL:
                balance -= tx.amount
        total_savings += balance

    if total_savings > 0:
        notifications.append({
            "id": -30003,
            "notification_type": "info",
            "title": "Savings update",
            "message": f"Your total savings balance is ${float(total_savings):,.2f}",
            "link": "/savings",
            "is_read": False,
            "created_at": now - timedelta(hours=6)
        })

    # --- No goals set reminder ---
    active_goals = db.query(Goal).filter(
        Goal.user_id == user.id,
        Goal.status == "active"
    ).count()

    if active_goals == 0:
        notifications.append({
            "id": -30004,
            "notification_type": "info",
            "title": "Set a financial goal",
            "message": "Create a savings goal to track your progress and stay motivated",
            "link": "/goals",
            "is_read": False,
            "created_at": now - timedelta(hours=12)
        })

    # --- No budget set reminder ---
    active_budgets = db.query(Budget).filter(
        Budget.user_id == user.id,
        Budget.is_active == True
    ).count()

    if active_budgets == 0:
        notifications.append({
            "id": -30005,
            "notification_type": "info",
            "title": "Create a budget",
            "message": "Set up budgets to track and control your spending by category",
            "link": "/budgets",
            "is_read": False,
            "created_at": now - timedelta(hours=14)
        })

    # --- Welcome notification (always shown if user is relatively new) ---
    if user.created_at:
        days_since_join = (now - user.created_at).days if hasattr(user.created_at, 'days') else (now.date() - user.created_at.date()).days if hasattr(user.created_at, 'date') else 30
        if days_since_join <= 30:
            notifications.append({
                "id": -30006,
                "notification_type": "system",
                "title": "Welcome to MyFinance!",
                "message": "Start by adding your income and expenses to get personalized insights",
                "link": "/",
                "is_read": False,
                "created_at": user.created_at if hasattr(user.created_at, 'year') else now - timedelta(days=1)
            })

    return notifications
