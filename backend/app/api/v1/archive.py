from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from decimal import Decimal
from typing import Optional
import calendar

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import Income, Expense, User

router = APIRouter(prefix="/archive", tags=["Archive"])


@router.get("")
def get_monthly_archives(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly archive summaries."""
    today = date.today()
    if not year:
        year = today.year

    archives = []

    # Get archives for all months in the year (up to current month if current year)
    max_month = today.month if year == today.year else 12

    for month in range(max_month, 0, -1):
        month_start = date(year, month, 1)
        month_end = date(year, month, calendar.monthrange(year, month)[1])

        # Get income for the month
        incomes = db.query(Income).filter(
            Income.user_id == current_user.id,
            Income.date >= month_start,
            Income.date <= month_end
        ).all()
        total_income = sum(i.amount for i in incomes)

        # Get expenses for the month
        expenses = db.query(Expense).filter(
            Expense.user_id == current_user.id,
            Expense.date >= month_start,
            Expense.date <= month_end
        ).all()
        total_expenses = sum(e.amount for e in expenses)

        # Calculate net and savings rate
        net = total_income - total_expenses
        savings_rate = (net / total_income * 100) if total_income > 0 else Decimal("0")

        # Get top expense category
        category_totals = {}
        for exp in expenses:
            category_totals[exp.category] = category_totals.get(exp.category, Decimal("0")) + exp.amount

        top_category = ""
        top_category_amount = Decimal("0")
        if category_totals:
            top = max(category_totals.items(), key=lambda x: x[1])
            top_category = top[0]
            top_category_amount = top[1]

        # Only include months with data
        if total_income > 0 or total_expenses > 0:
            archives.append({
                "month": calendar.month_name[month],
                "month_number": month,
                "year": year,
                "income": total_income,
                "expenses": total_expenses,
                "net": net,
                "savings_rate": savings_rate,
                "top_category": top_category,
                "top_category_amount": top_category_amount,
            })

    return archives


@router.get("/summary")
def get_archive_summary(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get summary statistics for archived months."""
    today = date.today()
    if not year:
        year = today.year

    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31) if year < today.year else today

    # Total income for the year
    incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= year_start,
        Income.date <= year_end
    ).all()
    total_income = sum(i.amount for i in incomes)

    # Total expenses for the year
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= year_start,
        Expense.date <= year_end
    ).all()
    total_expenses = sum(e.amount for e in expenses)

    # Calculate months with data
    months_with_data = set()
    for i in incomes:
        months_with_data.add(i.date.month)
    for e in expenses:
        months_with_data.add(e.date.month)

    month_count = len(months_with_data)
    avg_savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else Decimal("0")

    return {
        "year": year,
        "total_income": total_income,
        "total_expenses": total_expenses,
        "net_saved": total_income - total_expenses,
        "avg_savings_rate": avg_savings_rate,
        "month_count": month_count,
    }


@router.get("/years")
def get_available_years(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get years that have data."""
    income_years = db.query(Income.date).filter(
        Income.user_id == current_user.id
    ).distinct().all()

    expense_years = db.query(Expense.date).filter(
        Expense.user_id == current_user.id
    ).distinct().all()

    years = set()
    for (d,) in income_years:
        years.add(d.year)
    for (d,) in expense_years:
        years.add(d.year)

    return sorted(years, reverse=True)


@router.get("/{year}/{month}")
def get_month_detail(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed data for a specific month."""
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")

    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])

    # Get all income
    incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= month_start,
        Income.date <= month_end
    ).order_by(Income.date.desc()).all()

    # Get all expenses
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= month_start,
        Expense.date <= month_end
    ).order_by(Expense.date.desc()).all()

    total_income = sum(i.amount for i in incomes)
    total_expenses = sum(e.amount for e in expenses)

    # Category breakdowns
    income_by_category = {}
    for inc in incomes:
        income_by_category[inc.category] = income_by_category.get(inc.category, Decimal("0")) + inc.amount

    expense_by_category = {}
    for exp in expenses:
        expense_by_category[exp.category] = expense_by_category.get(exp.category, Decimal("0")) + exp.amount

    # Prepare income items
    income_items = [
        {
            "source": inc.source,
            "category": inc.category,
            "amount": float(inc.amount),
            "date": str(inc.date),
        }
        for inc in incomes
    ]

    # Prepare expense items
    expense_items = [
        {
            "description": exp.description,
            "category": exp.category,
            "amount": float(exp.amount),
            "date": str(exp.date),
        }
        for exp in expenses
    ]

    # Category breakdown for expenses
    category_breakdown = []
    if total_expenses > 0:
        for cat, amt in sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True):
            category_breakdown.append({
                "category": cat,
                "amount": float(amt),
                "percentage": float(amt / total_expenses * 100),
            })

    return {
        "month": calendar.month_name[month],
        "year": year,
        "total_income": float(total_income),
        "total_expenses": float(total_expenses),
        "net": float(total_income - total_expenses),
        "savings_rate": float((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0,
        "income_count": len(incomes),
        "expense_count": len(expenses),
        "income_items": income_items,
        "expense_items": expense_items,
        "category_breakdown": category_breakdown,
    }


@router.get("/{year}/{month}/export")
def export_month_data(
    year: int,
    month: int,
    format: str = "json",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export detailed data for a specific month."""
    from fastapi.responses import Response
    import csv
    import io

    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid month")

    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])

    # Get all data
    incomes = db.query(Income).filter(
        Income.user_id == current_user.id,
        Income.date >= month_start,
        Income.date <= month_end
    ).order_by(Income.date).all()

    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        Expense.date >= month_start,
        Expense.date <= month_end
    ).order_by(Expense.date).all()

    data = {
        "month": calendar.month_name[month],
        "year": year,
        "export_date": str(date.today()),
        "income": [
            {
                "date": str(i.date),
                "source": i.source,
                "category": i.category,
                "amount": float(i.amount),
                "notes": i.notes,
            }
            for i in incomes
        ],
        "expenses": [
            {
                "date": str(e.date),
                "description": e.description,
                "category": e.category,
                "amount": float(e.amount),
            }
            for e in expenses
        ],
        "summary": {
            "total_income": float(sum(i.amount for i in incomes)),
            "total_expenses": float(sum(e.amount for e in expenses)),
            "net": float(sum(i.amount for i in incomes) - sum(e.amount for e in expenses)),
        }
    }

    if format == "json":
        return data

    # CSV format
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([f"{calendar.month_name[month]} {year} Financial Report"])
    writer.writerow([])

    writer.writerow(["=== INCOME ==="])
    writer.writerow(["Date", "Source", "Category", "Amount", "Notes"])
    for i in incomes:
        writer.writerow([str(i.date), i.source, i.category, float(i.amount), i.notes or ""])
    writer.writerow([])

    writer.writerow(["=== EXPENSES ==="])
    writer.writerow(["Date", "Description", "Category", "Amount"])
    for e in expenses:
        writer.writerow([str(e.date), e.description, e.category, float(e.amount)])
    writer.writerow([])

    writer.writerow(["=== SUMMARY ==="])
    writer.writerow(["Total Income", data["summary"]["total_income"]])
    writer.writerow(["Total Expenses", data["summary"]["total_expenses"]])
    writer.writerow(["Net", data["summary"]["net"]])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={calendar.month_name[month]}-{year}.csv"}
    )
