from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import BusinessIncome, User
from app.schemas import BusinessIncomeCreate, BusinessIncomeUpdate, BusinessIncomeResponse

router = APIRouter(prefix="/business", tags=["Business"])


@router.get("", response_model=List[BusinessIncomeResponse])
def get_invoices(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all invoices for the current user."""
    query = db.query(BusinessIncome).filter(BusinessIncome.user_id == current_user.id)

    if status:
        query = query.filter(BusinessIncome.status == status)

    return query.order_by(BusinessIncome.date.desc()).offset(skip).limit(limit).all()


@router.get("/summary")
def get_business_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get business income summary."""
    invoices = db.query(BusinessIncome).filter(
        BusinessIncome.user_id == current_user.id
    ).all()

    total = sum(i.amount for i in invoices)
    paid = sum(i.amount for i in invoices if i.status.value == "paid")
    outstanding = sum(i.amount for i in invoices if i.status.value in ["sent", "pending"])
    overdue = sum(i.amount for i in invoices if i.status.value == "overdue")

    return {
        "total": total,
        "paid": paid,
        "outstanding": outstanding,
        "overdue": overdue,
        "count": len(invoices)
    }


@router.get("/{invoice_id}", response_model=BusinessIncomeResponse)
def get_invoice_by_id(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific invoice."""
    invoice = db.query(BusinessIncome).filter(
        BusinessIncome.id == invoice_id,
        BusinessIncome.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return invoice


@router.post("", response_model=BusinessIncomeResponse)
def create_invoice(
    invoice_in: BusinessIncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new invoice."""
    invoice = BusinessIncome(
        user_id=current_user.id,
        **invoice_in.model_dump()
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.put("/{invoice_id}", response_model=BusinessIncomeResponse)
def update_invoice(
    invoice_id: int,
    invoice_in: BusinessIncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an invoice."""
    invoice = db.query(BusinessIncome).filter(
        BusinessIncome.id == invoice_id,
        BusinessIncome.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    for field, value in invoice_in.model_dump(exclude_unset=True).items():
        setattr(invoice, field, value)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an invoice."""
    invoice = db.query(BusinessIncome).filter(
        BusinessIncome.id == invoice_id,
        BusinessIncome.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}
