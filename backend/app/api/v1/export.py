from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
import csv
import io
import json
from datetime import datetime

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import (
    User, Income, Expense, Goal, Budget,
    InvestmentHolding, Debt, RecurringTransaction,
    SavingsAccount, SavingsTransaction, BusinessIncome
)

router = APIRouter(prefix="/export", tags=["Export"])


def serialize_date(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, 'value'):  # Handle Enum
        return obj.value
    raise TypeError(f"Type {type(obj)} not serializable")


@router.get("")
def export_all_data(
    format: str = Query("json", pattern="^(json|csv)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all user data in JSON or CSV format."""

    # Gather all data
    data = {
        "export_date": datetime.utcnow().isoformat(),
        "user": {
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
        },
        "income": [],
        "expenses": [],
        "budgets": [],
        "goals": [],
        "investments": [],
        "debts": [],
        "recurring_transactions": [],
        "savings_accounts": [],
        "savings_transactions": [],
        "business_income": [],
    }

    # Income
    incomes = db.query(Income).filter(Income.user_id == current_user.id).all()
    for item in incomes:
        data["income"].append({
            "id": item.id,
            "source": item.source,
            "category": item.category,
            "amount": float(item.amount) if item.amount else 0,
            "currency": item.currency,
            "date": str(item.date) if item.date else None,
            "notes": item.notes,
            "payment_method": item.payment_method,
        })

    # Expenses
    expenses = db.query(Expense).filter(Expense.user_id == current_user.id).all()
    for item in expenses:
        data["expenses"].append({
            "id": item.id,
            "description": item.description,
            "category": item.category,
            "amount": float(item.amount),
            "currency": item.currency,
            "date": str(item.date),
            "payment_method": item.payment_method,
        })

    # Budgets
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    for item in budgets:
        data["budgets"].append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "amount": float(item.amount),
            "spent": float(item.spent) if item.spent else 0,
            "period": item.period.value if item.period else None,
            "start_date": str(item.start_date) if item.start_date else None,
            "end_date": str(item.end_date) if item.end_date else None,
            "is_active": item.is_active,
        })

    # Goals
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    for item in goals:
        data["goals"].append({
            "id": item.id,
            "name": item.name,
            "category": item.category,
            "target_amount": float(item.target_amount),
            "current_amount": float(item.current_amount) if item.current_amount else 0,
            "target_date": str(item.target_date) if item.target_date else None,
            "status": item.status.value if item.status else None,
        })

    # Investments
    investments = db.query(InvestmentHolding).filter(InvestmentHolding.user_id == current_user.id).all()
    for item in investments:
        quantity = float(item.quantity) if item.quantity else 0
        current_price = float(item.current_price) if item.current_price else 0
        data["investments"].append({
            "id": item.id,
            "name": item.name,
            "symbol": item.symbol,
            "asset_type": item.asset_type,
            "quantity": quantity,
            "average_cost": float(item.average_cost) if item.average_cost else 0,
            "current_price": current_price,
            "current_value": quantity * current_price,
        })

    # Debts
    debts = db.query(Debt).filter(Debt.user_id == current_user.id).all()
    for item in debts:
        # debt_type is a String field, not an Enum
        debt_type = item.debt_type
        if hasattr(debt_type, 'value'):
            debt_type = debt_type.value
        data["debts"].append({
            "id": item.id,
            "name": item.name,
            "debt_type": debt_type,
            "original_amount": float(item.original_amount) if item.original_amount else 0,
            "current_balance": float(item.current_balance) if item.current_balance else 0,
            "interest_rate": float(item.interest_rate) if item.interest_rate else 0,
            "minimum_payment": float(item.minimum_payment) if item.minimum_payment else 0,
        })

    # Recurring
    recurring = db.query(RecurringTransaction).filter(RecurringTransaction.user_id == current_user.id).all()
    for item in recurring:
        data["recurring_transactions"].append({
            "id": item.id,
            "name": item.name,
            "transaction_type": item.transaction_type.value if item.transaction_type else None,
            "category": item.category,
            "amount": float(item.amount),
            "frequency": item.frequency.value if item.frequency else None,
            "start_date": str(item.start_date) if item.start_date else None,
            "is_active": item.is_active,
        })

    # Savings Accounts
    savings = db.query(SavingsAccount).filter(SavingsAccount.user_id == current_user.id).all()
    for item in savings:
        data["savings_accounts"].append({
            "id": item.id,
            "name": item.name,
            "account_type": item.account_type,
            "institution": item.institution,
            "initial_balance": float(item.initial_balance) if item.initial_balance else 0,
            "currency": item.currency,
            "is_active": item.is_active,
        })

    # Savings Transactions
    savings_txns = db.query(SavingsTransaction).filter(
        SavingsTransaction.user_id == current_user.id
    ).all()
    for item in savings_txns:
        data["savings_transactions"].append({
            "id": item.id,
            "account_id": item.account_id,
            "transaction_type": item.transaction_type.value if item.transaction_type else None,
            "amount": float(item.amount),
            "date": str(item.date) if item.date else None,
            "description": item.description,
        })

    # Business Income
    business = db.query(BusinessIncome).filter(BusinessIncome.user_id == current_user.id).all()
    for item in business:
        data["business_income"].append({
            "id": item.id,
            "client": item.client,
            "invoice_number": item.invoice_number,
            "amount": float(item.amount),
            "status": item.status.value if item.status else None,
            "date": str(item.date) if item.date else None,
        })

    if format == "json":
        return data

    # CSV format - flatten data into a single CSV with sections
    output = io.StringIO()

    # Helper to write a section
    def write_section(writer, title, items, fieldnames):
        writer.writerow([f"=== {title} ==="])
        if items:
            writer.writerow(fieldnames)
            for item in items:
                writer.writerow([item.get(f, '') for f in fieldnames])
        else:
            writer.writerow(["No data"])
        writer.writerow([])

    writer = csv.writer(output)
    writer.writerow([f"MyFinance Data Export - {data['export_date']}"])
    writer.writerow([f"User: {data['user']['email']}"])
    writer.writerow([])

    write_section(writer, "Income", data["income"],
                  ["id", "source", "category", "amount", "currency", "date", "notes", "payment_method"])
    write_section(writer, "Expenses", data["expenses"],
                  ["id", "description", "category", "amount", "currency", "date", "payment_method"])
    write_section(writer, "Budgets", data["budgets"],
                  ["id", "name", "category", "amount", "spent", "period", "is_active"])
    write_section(writer, "Goals", data["goals"],
                  ["id", "name", "category", "target_amount", "current_amount", "target_date", "status"])
    write_section(writer, "Investments", data["investments"],
                  ["id", "name", "symbol", "asset_type", "quantity", "average_cost", "current_price", "current_value"])
    write_section(writer, "Debts", data["debts"],
                  ["id", "name", "debt_type", "original_amount", "current_balance", "interest_rate", "minimum_payment"])
    write_section(writer, "Recurring Transactions", data["recurring_transactions"],
                  ["id", "name", "transaction_type", "category", "amount", "frequency", "is_active"])
    write_section(writer, "Savings Accounts", data["savings_accounts"],
                  ["id", "name", "account_type", "institution", "initial_balance", "currency", "is_active"])
    write_section(writer, "Business Income", data["business_income"],
                  ["id", "client", "invoice_number", "amount", "status", "date"])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=finance-export.csv"}
    )
