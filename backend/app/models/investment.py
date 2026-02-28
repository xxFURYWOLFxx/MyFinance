from sqlalchemy import Column, Integer, String, Date, Numeric, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class InvestmentTransactionType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"
    DIVIDEND = "dividend"
    SPLIT = "split"
    TRANSFER = "transfer"


class InvestmentAccount(Base):
    __tablename__ = "investment_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    account_type = Column(String(50), nullable=True)
    institution = Column(String(100), nullable=True)
    currency = Column(String(3), default="USD")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<InvestmentAccount {self.id}: {self.name}>"


class InvestmentHolding(Base):
    __tablename__ = "investment_holdings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("investment_accounts.id", ondelete="CASCADE"), nullable=True)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(200), nullable=True)
    asset_type = Column(String(50), nullable=True)
    quantity = Column(Numeric(20, 8), nullable=False)
    average_cost = Column(Numeric(15, 4), nullable=True)
    current_price = Column(Numeric(15, 4), nullable=True)
    last_price_update = Column(DateTime(timezone=True), nullable=True)
    currency = Column(String(3), default="USD")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<InvestmentHolding {self.id}: {self.symbol} - {self.quantity}>"


class InvestmentTransaction(Base):
    __tablename__ = "investment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    holding_id = Column(Integer, ForeignKey("investment_holdings.id", ondelete="CASCADE"), nullable=True)
    account_id = Column(Integer, ForeignKey("investment_accounts.id", ondelete="CASCADE"), nullable=True)
    transaction_type = Column(SQLEnum(InvestmentTransactionType), nullable=False)
    quantity = Column(Numeric(20, 8), nullable=True)
    price_per_unit = Column(Numeric(15, 4), nullable=True)
    total_amount = Column(Numeric(15, 2), nullable=True)
    fees = Column(Numeric(15, 2), default=0)
    date = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<InvestmentTransaction {self.id}: {self.transaction_type}>"


class FavoriteAsset(Base):
    """User's favorite/watchlist assets for quick access."""
    __tablename__ = "favorite_assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    name = Column(String(200), nullable=True)
    asset_type = Column(String(50), nullable=False)  # stock, crypto, etf, etc.
    display_order = Column(Integer, default=0)  # For custom ordering
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<FavoriteAsset {self.id}: {self.symbol}>"


class UserInvestmentSettings(Base):
    """User's investment page settings/preferences."""
    __tablename__ = "user_investment_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Chart settings
    default_chart_type = Column(String(20), default="candle")  # area, candle
    default_period = Column(String(10), default="1d")  # 1d, 5d, 1m, 3m, 6m, 1y
    default_interval = Column(String(10), default="5m")  # 1m, 5m, 15m, 1h, etc.
    default_candle_count = Column(Integer, default=100)  # 50, 100, 200, 500, 0 (all)
    auto_refresh_interval = Column(Integer, default=60000)  # milliseconds, 0 = off

    # Display settings
    show_volume = Column(Boolean, default=False)
    show_indicators = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<UserInvestmentSettings user_id={self.user_id}>"
