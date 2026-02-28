from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date
from decimal import Decimal

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models import SavingsAccount, SavingsTransaction, User, TransactionType
from app.schemas import (
    SavingsAccountCreate, SavingsAccountUpdate, SavingsAccountResponse,
    SavingsTransactionCreate, SavingsTransactionUpdate, SavingsTransactionResponse
)

router = APIRouter(prefix="/savings", tags=["Savings"])


def calculate_account_balance(db: Session, account_id: int, user_id: int) -> Decimal:
    """Calculate the current balance of a savings account."""
    account = db.query(SavingsAccount).filter(
        SavingsAccount.id == account_id,
        SavingsAccount.user_id == user_id
    ).first()

    if not account:
        return Decimal("0")

    balance = account.initial_balance or Decimal("0")

    transactions = db.query(SavingsTransaction).filter(
        SavingsTransaction.account_id == account_id,
        SavingsTransaction.user_id == user_id
    ).all()

    for tx in transactions:
        if tx.transaction_type in [TransactionType.DEPOSIT, TransactionType.INTEREST]:
            balance += tx.amount
        elif tx.transaction_type == TransactionType.WITHDRAWAL:
            balance -= tx.amount

    return balance


# ============ Accounts ============

@router.get("/accounts", response_model=List[SavingsAccountResponse])
def get_accounts(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all savings accounts for the current user."""
    query = db.query(SavingsAccount).filter(SavingsAccount.user_id == current_user.id)

    if not include_inactive:
        query = query.filter(SavingsAccount.is_active == True)

    accounts = query.all()

    # Add computed balance to each account
    result = []
    for account in accounts:
        account_dict = {
            "id": account.id,
            "user_id": account.user_id,
            "name": account.name,
            "account_type": account.account_type,
            "institution": account.institution,
            "currency": account.currency,
            "initial_balance": account.initial_balance,
            "is_active": account.is_active,
            "created_at": account.created_at,
            "balance": calculate_account_balance(db, account.id, current_user.id)
        }
        result.append(SavingsAccountResponse(**account_dict))

    return result


@router.get("/accounts/{account_id}", response_model=SavingsAccountResponse)
def get_account_by_id(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific savings account."""
    account = db.query(SavingsAccount).filter(
        SavingsAccount.id == account_id,
        SavingsAccount.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return SavingsAccountResponse(
        id=account.id,
        user_id=account.user_id,
        name=account.name,
        account_type=account.account_type,
        institution=account.institution,
        currency=account.currency,
        initial_balance=account.initial_balance,
        is_active=account.is_active,
        created_at=account.created_at,
        balance=calculate_account_balance(db, account.id, current_user.id)
    )


@router.post("/accounts", response_model=SavingsAccountResponse)
def create_account(
    account_in: SavingsAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new savings account."""
    account = SavingsAccount(
        user_id=current_user.id,
        **account_in.model_dump()
    )
    db.add(account)
    db.commit()
    db.refresh(account)

    return SavingsAccountResponse(
        id=account.id,
        user_id=account.user_id,
        name=account.name,
        account_type=account.account_type,
        institution=account.institution,
        currency=account.currency,
        initial_balance=account.initial_balance,
        is_active=account.is_active,
        created_at=account.created_at,
        balance=account.initial_balance or Decimal("0")
    )


@router.put("/accounts/{account_id}", response_model=SavingsAccountResponse)
def update_account(
    account_id: int,
    account_in: SavingsAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a savings account."""
    account = db.query(SavingsAccount).filter(
        SavingsAccount.id == account_id,
        SavingsAccount.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    for field, value in account_in.model_dump(exclude_unset=True).items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)

    return SavingsAccountResponse(
        id=account.id,
        user_id=account.user_id,
        name=account.name,
        account_type=account.account_type,
        institution=account.institution,
        currency=account.currency,
        initial_balance=account.initial_balance,
        is_active=account.is_active,
        created_at=account.created_at,
        balance=calculate_account_balance(db, account.id, current_user.id)
    )


@router.delete("/accounts/{account_id}")
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a savings account."""
    account = db.query(SavingsAccount).filter(
        SavingsAccount.id == account_id,
        SavingsAccount.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(account)
    db.commit()
    return {"message": "Account deleted successfully"}


# ============ Transactions ============

@router.get("/transactions", response_model=List[SavingsTransactionResponse])
def get_transactions(
    account_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all savings transactions for the current user."""
    query = db.query(SavingsTransaction).filter(SavingsTransaction.user_id == current_user.id)

    if account_id:
        query = query.filter(SavingsTransaction.account_id == account_id)

    return query.order_by(SavingsTransaction.date.desc()).offset(skip).limit(limit).all()


@router.post("/transactions", response_model=SavingsTransactionResponse)
def create_transaction(
    transaction_in: SavingsTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new savings transaction."""
    # Verify account exists if provided
    if transaction_in.account_id:
        account = db.query(SavingsAccount).filter(
            SavingsAccount.id == transaction_in.account_id,
            SavingsAccount.user_id == current_user.id
        ).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

    transaction = SavingsTransaction(
        user_id=current_user.id,
        **transaction_in.model_dump()
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a savings transaction."""
    transaction = db.query(SavingsTransaction).filter(
        SavingsTransaction.id == transaction_id,
        SavingsTransaction.user_id == current_user.id
    ).first()

    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted successfully"}
