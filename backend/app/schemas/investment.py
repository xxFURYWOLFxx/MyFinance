from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from enum import Enum


class InvestmentType(str, Enum):
    stock = "stock"
    etf = "etf"
    crypto = "crypto"
    bond = "bond"
    reit = "reit"
    other = "other"


class InvestmentTransactionType(str, Enum):
    buy = "buy"
    sell = "sell"
    dividend = "dividend"
    split = "split"


class InvestmentHoldingBase(BaseModel):
    symbol: str
    name: Optional[str] = None
    holding_type: Optional[InvestmentType] = None
    quantity: Decimal
    average_cost: Optional[Decimal] = None
    current_price: Optional[Decimal] = None


class InvestmentHoldingCreate(BaseModel):
    symbol: str
    name: Optional[str] = None
    holding_type: Optional[InvestmentType] = None
    quantity: Decimal
    average_cost: Optional[Decimal] = None
    current_price: Optional[Decimal] = None


class InvestmentHoldingUpdate(BaseModel):
    symbol: Optional[str] = None
    name: Optional[str] = None
    holding_type: Optional[InvestmentType] = None
    quantity: Optional[Decimal] = None
    average_cost: Optional[Decimal] = None
    current_price: Optional[Decimal] = None


class InvestmentHoldingResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    name: Optional[str] = None
    asset_type: Optional[str] = None
    quantity: Decimal
    average_cost: Optional[Decimal] = None
    current_price: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime
    # Computed fields
    current_value: Optional[Decimal] = None
    gain_loss: Optional[Decimal] = None
    gain_loss_percent: Optional[Decimal] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_holding(cls, holding):
        """Create response with computed fields."""
        quantity = holding.quantity or Decimal("0")
        current_price = holding.current_price or Decimal("0")
        average_cost = holding.average_cost or Decimal("0")

        current_value = quantity * current_price
        cost_basis = quantity * average_cost
        gain_loss = current_value - cost_basis
        gain_loss_percent = (gain_loss / cost_basis * 100) if cost_basis > 0 else Decimal("0")

        return cls(
            id=holding.id,
            user_id=holding.user_id,
            symbol=holding.symbol,
            name=holding.name,
            asset_type=holding.asset_type,
            quantity=quantity,
            average_cost=average_cost,
            current_price=current_price,
            created_at=holding.created_at,
            updated_at=holding.updated_at,
            current_value=current_value,
            gain_loss=gain_loss,
            gain_loss_percent=gain_loss_percent,
        )


class InvestmentTransactionBase(BaseModel):
    holding_id: int
    transaction_type: InvestmentTransactionType
    quantity: Decimal
    price: Decimal
    date: date
    fees: Decimal = Decimal("0")
    notes: Optional[str] = None


class InvestmentTransactionCreate(InvestmentTransactionBase):
    pass


class InvestmentTransactionResponse(InvestmentTransactionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Favorite Asset Schemas ============

class FavoriteAssetCreate(BaseModel):
    symbol: str
    name: Optional[str] = None
    asset_type: str  # stock, crypto, etf, bond, reit, other


class FavoriteAssetUpdate(BaseModel):
    name: Optional[str] = None
    display_order: Optional[int] = None


class FavoriteAssetResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    name: Optional[str] = None
    asset_type: str
    display_order: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ User Investment Settings Schemas ============

class UserInvestmentSettingsCreate(BaseModel):
    default_chart_type: Optional[str] = "candle"
    default_period: Optional[str] = "1d"
    default_interval: Optional[str] = "5m"
    default_candle_count: Optional[int] = 100
    auto_refresh_interval: Optional[int] = 60000
    show_volume: Optional[bool] = False
    show_indicators: Optional[bool] = False


class UserInvestmentSettingsUpdate(BaseModel):
    default_chart_type: Optional[str] = None
    default_period: Optional[str] = None
    default_interval: Optional[str] = None
    default_candle_count: Optional[int] = None
    auto_refresh_interval: Optional[int] = None
    show_volume: Optional[bool] = None
    show_indicators: Optional[bool] = None


class UserInvestmentSettingsResponse(BaseModel):
    id: int
    user_id: int
    default_chart_type: str
    default_period: str
    default_interval: str
    default_candle_count: int
    auto_refresh_interval: int
    show_volume: bool
    show_indicators: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
