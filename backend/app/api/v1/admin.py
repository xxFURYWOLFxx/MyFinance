from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from decimal import Decimal
from typing import Optional, List

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import User, Income, Expense, SavingsAccount, SavingsTransaction, TransactionType
from app.core.system_settings import get_all_security_settings, set_setting, invalidate_cache

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to require admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get system-wide statistics."""
    today = date.today()
    yesterday = today - timedelta(days=1)

    # Total users
    total_users = db.query(User).count()

    # Active users (logged in within last 30 days)
    thirty_days_ago = today - timedelta(days=30)
    active_users = db.query(User).filter(
        User.last_login_at >= thirty_days_ago
    ).count()

    # New users today
    new_users_today = db.query(User).filter(
        func.date(User.created_at) == today
    ).count()

    # Total transactions (income + expenses)
    total_incomes = db.query(Income).count()
    total_expenses = db.query(Expense).count()
    total_transactions = total_incomes + total_expenses

    # Total volume
    income_volume = db.query(func.sum(Income.amount)).scalar() or Decimal("0")
    expense_volume = db.query(func.sum(Expense.amount)).scalar() or Decimal("0")
    total_volume = income_volume + expense_volume

    # Average user balance
    avg_balance = total_volume / total_users if total_users > 0 else Decimal("0")

    return {
        "total_users": total_users,
        "active_users": active_users,
        "new_users_today": new_users_today,
        "total_transactions": total_transactions,
        "total_volume": total_volume,
        "avg_user_balance": avg_balance,
    }


@router.get("/users")
def get_all_users(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get all users with their statistics."""
    query = db.query(User)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_filter)) |
            (User.first_name.ilike(search_filter)) |
            (User.last_name.ilike(search_filter))
        )

    if status == "active":
        query = query.filter(User.is_active == True)
    elif status == "inactive":
        query = query.filter(User.is_active == False)

    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for user in users:
        # Get user's total balance
        user_income = db.query(func.sum(Income.amount)).filter(
            Income.user_id == user.id
        ).scalar() or Decimal("0")

        user_expenses = db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == user.id
        ).scalar() or Decimal("0")

        # Get transaction count
        income_count = db.query(Income).filter(Income.user_id == user.id).count()
        expense_count = db.query(Expense).filter(Expense.user_id == user.id).count()

        # Determine status
        if not user.is_active:
            user_status = "suspended"
        elif user.last_login_at and (date.today() - user.last_login_at.date()).days > 30:
            user_status = "inactive"
        else:
            user_status = "active"

        result.append({
            "id": user.id,
            "email": user.email,
            "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email.split('@')[0],
            "role": user.role,
            "status": user_status,
            "last_login": user.last_login_at.isoformat() if user.last_login_at else None,
            "total_balance": user_income - user_expenses,
            "transactions": income_count + expense_count,
            "created_at": user.created_at.isoformat(),
        })

    return result


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get detailed information about a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get user's financial summary
    user_income = db.query(func.sum(Income.amount)).filter(
        Income.user_id == user.id
    ).scalar() or Decimal("0")

    user_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user.id
    ).scalar() or Decimal("0")

    income_count = db.query(Income).filter(Income.user_id == user.id).count()
    expense_count = db.query(Expense).filter(Expense.user_id == user.id).count()

    # Get savings
    accounts = db.query(SavingsAccount).filter(
        SavingsAccount.user_id == user.id,
        SavingsAccount.is_active == True
    ).all()

    total_savings = Decimal("0")
    for account in accounts:
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

    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat(),
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        "base_currency": user.base_currency,
        "timezone": user.timezone,
        "financial_summary": {
            "total_income": user_income,
            "total_expenses": user_expenses,
            "net_balance": user_income - user_expenses,
            "total_savings": total_savings,
            "income_count": income_count,
            "expense_count": expense_count,
        }
    }


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Activate or deactivate a user account."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = is_active
    db.commit()

    return {"message": f"User {'activated' if is_active else 'deactivated'} successfully"}


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update user role."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own role")

    if role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = role
    db.commit()

    return {"message": f"User role updated to {role}"}


@router.get("/activity")
def get_recent_activity(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get recent system activity."""
    activity = []

    # Get recent signups
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    for user in recent_users:
        activity.append({
            "type": "signup",
            "user": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email.split('@')[0],
            "user_id": user.id,
            "timestamp": user.created_at.isoformat(),
            "details": None,
        })

    # Get recent logins
    recent_logins = db.query(User).filter(
        User.last_login_at.isnot(None)
    ).order_by(User.last_login_at.desc()).limit(5).all()
    for user in recent_logins:
        activity.append({
            "type": "login",
            "user": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email.split('@')[0],
            "user_id": user.id,
            "timestamp": user.last_login_at.isoformat(),
            "details": None,
        })

    # Get recent transactions
    recent_incomes = db.query(Income).order_by(Income.created_at.desc()).limit(5).all()
    for income in recent_incomes:
        user = db.query(User).filter(User.id == income.user_id).first()
        activity.append({
            "type": "transaction",
            "user": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Unknown",
            "user_id": income.user_id,
            "timestamp": income.created_at.isoformat(),
            "details": {"amount": float(income.amount), "transaction_type": "income"},
        })

    recent_expenses = db.query(Expense).order_by(Expense.created_at.desc()).limit(5).all()
    for expense in recent_expenses:
        user = db.query(User).filter(User.id == expense.user_id).first()
        activity.append({
            "type": "transaction",
            "user": f"{user.first_name or ''} {user.last_name or ''}".strip() if user else "Unknown",
            "user_id": expense.user_id,
            "timestamp": expense.created_at.isoformat(),
            "details": {"amount": float(expense.amount), "transaction_type": "expense"},
        })

    # Sort by timestamp and limit
    activity.sort(key=lambda x: x["timestamp"], reverse=True)
    return activity[:limit]


@router.get("/analytics")
def get_system_analytics(
    period: str = "7d",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get system-wide analytics."""
    today = date.today()

    if period == "7d":
        days = 7
    elif period == "30d":
        days = 30
    elif period == "90d":
        days = 90
    elif period == "1y":
        days = 365
    else:
        days = 7

    start_date = today - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)
    prev_end = start_date - timedelta(days=1)

    # Current period
    current_users = db.query(User).filter(
        func.date(User.created_at) >= start_date
    ).count()

    current_income_vol = db.query(func.sum(Income.amount)).filter(
        Income.date >= start_date
    ).scalar() or Decimal("0")

    current_expense_vol = db.query(func.sum(Expense.amount)).filter(
        Expense.date >= start_date
    ).scalar() or Decimal("0")

    # Previous period
    prev_users = db.query(User).filter(
        func.date(User.created_at) >= prev_start,
        func.date(User.created_at) <= prev_end
    ).count()

    prev_income_vol = db.query(func.sum(Income.amount)).filter(
        Income.date >= prev_start,
        Income.date <= prev_end
    ).scalar() or Decimal("0")

    prev_expense_vol = db.query(func.sum(Expense.amount)).filter(
        Expense.date >= prev_start,
        Expense.date <= prev_end
    ).scalar() or Decimal("0")

    return {
        "period": period,
        "user_growth": {
            "current": current_users,
            "previous": prev_users,
            "change": current_users - prev_users,
        },
        "transaction_volume": {
            "current": current_income_vol + current_expense_vol,
            "previous": prev_income_vol + prev_expense_vol,
            "income": current_income_vol,
            "expenses": current_expense_vol,
        },
    }


@router.get("/alerts")
def get_system_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get system alerts and warnings."""
    today = date.today()
    alerts = []

    # Check for high transaction volume
    week_ago = today - timedelta(days=7)
    two_weeks_ago = today - timedelta(days=14)

    this_week_vol = db.query(func.sum(Income.amount)).filter(
        Income.date >= week_ago
    ).scalar() or Decimal("0")

    last_week_vol = db.query(func.sum(Income.amount)).filter(
        Income.date >= two_weeks_ago,
        Income.date < week_ago
    ).scalar() or Decimal("1")

    if this_week_vol > last_week_vol * Decimal("1.3"):
        change = ((this_week_vol - last_week_vol) / last_week_vol * 100)
        alerts.append({
            "type": "warning",
            "title": "High transaction volume detected",
            "message": f"Transaction volume is {change:.0f}% higher than usual. Monitor for potential issues.",
        })

    # Check for inactive users
    thirty_days_ago = today - timedelta(days=30)
    inactive_count = db.query(User).filter(
        (User.last_login_at < thirty_days_ago) | (User.last_login_at.is_(None)),
        User.is_active == True
    ).count()

    if inactive_count > 0:
        alerts.append({
            "type": "info",
            "title": f"{inactive_count} users have been inactive for 30+ days",
            "message": "Consider sending re-engagement emails.",
        })

    # Check for suspended accounts
    suspended_count = db.query(User).filter(User.is_active == False).count()
    if suspended_count > 0:
        alerts.append({
            "type": "info",
            "title": f"{suspended_count} suspended accounts",
            "message": "Review suspended accounts for potential reactivation.",
        })

    return alerts


class SecuritySettingsUpdate(BaseModel):
    access_token_expire_minutes: Optional[int] = Field(None, ge=5, le=1440)
    refresh_token_expire_days: Optional[int] = Field(None, ge=1, le=90)
    ip_binding_enabled: Optional[bool] = None


@router.get("/security-settings")
def get_security_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get current security settings."""
    raw = get_all_security_settings(db)
    return {
        "access_token_expire_minutes": int(raw["access_token_expire_minutes"]),
        "refresh_token_expire_days": int(raw["refresh_token_expire_days"]),
        "ip_binding_enabled": raw["ip_binding_enabled"].lower() == "true",
    }


@router.put("/security-settings")
def update_security_settings(
    data: SecuritySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update security settings. Only changed fields are updated."""
    if data.access_token_expire_minutes is not None:
        set_setting(db, "access_token_expire_minutes", str(data.access_token_expire_minutes))
    if data.refresh_token_expire_days is not None:
        set_setting(db, "refresh_token_expire_days", str(data.refresh_token_expire_days))
    if data.ip_binding_enabled is not None:
        set_setting(db, "ip_binding_enabled", str(data.ip_binding_enabled).lower())

    invalidate_cache()

    # Return the updated settings
    raw = get_all_security_settings(db)
    return {
        "access_token_expire_minutes": int(raw["access_token_expire_minutes"]),
        "refresh_token_expire_days": int(raw["refresh_token_expire_days"]),
        "ip_binding_enabled": raw["ip_binding_enabled"].lower() == "true",
    }
