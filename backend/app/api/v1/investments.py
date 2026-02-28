from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from decimal import Decimal
import httpx
import asyncio
import time
from functools import lru_cache

from app.db.session import get_db

# ============ Backend Cache for Chart Data ============
# Simple in-memory cache to reduce API calls and handle rate limits

class ChartCache:
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = default_ttl

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        if key in self._cache:
            entry = self._cache[key]
            if time.time() < entry["expires"]:
                return entry["data"]
            else:
                del self._cache[key]
        return None

    def set(self, key: str, data: Dict[str, Any], ttl: Optional[int] = None):
        self._cache[key] = {
            "data": data,
            "expires": time.time() + (ttl or self._default_ttl)
        }

    def clear_expired(self):
        now = time.time()
        expired = [k for k, v in self._cache.items() if now >= v["expires"]]
        for k in expired:
            del self._cache[k]

# Global chart cache instance
chart_cache = ChartCache(default_ttl=300)  # 5 minute cache
from app.api.deps import get_current_user
from app.models import InvestmentHolding, InvestmentTransaction, User, FavoriteAsset, UserInvestmentSettings
from app.schemas import (
    InvestmentHoldingCreate, InvestmentHoldingUpdate, InvestmentHoldingResponse,
    InvestmentTransactionCreate, InvestmentTransactionResponse,
    FavoriteAssetCreate, FavoriteAssetUpdate, FavoriteAssetResponse,
    UserInvestmentSettingsCreate, UserInvestmentSettingsUpdate, UserInvestmentSettingsResponse,
)

router = APIRouter(prefix="/investments", tags=["Investments"])


# ============ Real-time Price Lookup ============

# Extended crypto symbol mappings
CRYPTO_SYMBOL_TO_ID = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "BNB": "binancecoin",
    "XRP": "ripple",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "SOL": "solana",
    "DOT": "polkadot",
    "MATIC": "matic-network",
    "POLYGON": "matic-network",
    "SHIB": "shiba-inu",
    "LTC": "litecoin",
    "AVAX": "avalanche-2",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "ATOM": "cosmos",
    "XLM": "stellar",
    "ALGO": "algorand",
    "VET": "vechain",
    "ICP": "internet-computer",
    "FIL": "filecoin",
    "AAVE": "aave",
    "EOS": "eos",
    "XTZ": "tezos",
    "THETA": "theta-token",
    "XMR": "monero",
    "NEO": "neo",
    "MKR": "maker",
    "KSM": "kusama",
    "COMP": "compound-governance-token",
    "SUSHI": "sushi",
    "YFI": "yearn-finance",
    "SNX": "havven",
    "CRV": "curve-dao-token",
    "1INCH": "1inch",
    "ENJ": "enjincoin",
    "MANA": "decentraland",
    "SAND": "the-sandbox",
    "AXS": "axie-infinity",
    "GALA": "gala",
    "APE": "apecoin",
    "LDO": "lido-dao",
    "ARB": "arbitrum",
    "OP": "optimism",
    "PEPE": "pepe",
    "WLD": "worldcoin-wld",
    "SUI": "sui",
    "SEI": "sei-network",
    "TIA": "celestia",
    "INJ": "injective-protocol",
    "NEAR": "near",
    "FTM": "fantom",
    "RUNE": "thorchain",
    "CRO": "crypto-com-chain",
    "EGLD": "elrond-erd-2",
    "HBAR": "hedera-hashgraph",
    "QNT": "quant-network",
    "FLOW": "flow",
    "CHZ": "chiliz",
    "APT": "aptos",
    "IMX": "immutable-x",
    "GRT": "the-graph",
    "RENDER": "render-token",
    "FET": "fetch-ai",
    "RNDR": "render-token",
    "STX": "blockstack",
    "KAVA": "kava",
    "ROSE": "oasis-network",
    "ZIL": "zilliqa",
    "WAVES": "waves",
    "CELO": "celo",
    "ONE": "harmony",
    "IOTA": "iota",
    "ZEC": "zcash",
    "DASH": "dash",
    "ETC": "ethereum-classic",
    "BCH": "bitcoin-cash",
    "TRX": "tron",
    "USDT": "tether",
    "USDC": "usd-coin",
    "DAI": "dai",
    "BUSD": "binance-usd",
}

# Crypto name mappings for display
CRYPTO_NAMES = {
    "BTC": "Bitcoin",
    "ETH": "Ethereum",
    "BNB": "Binance Coin",
    "XRP": "XRP",
    "ADA": "Cardano",
    "DOGE": "Dogecoin",
    "SOL": "Solana",
    "DOT": "Polkadot",
    "MATIC": "Polygon",
    "SHIB": "Shiba Inu",
    "LTC": "Litecoin",
    "AVAX": "Avalanche",
    "LINK": "Chainlink",
    "UNI": "Uniswap",
    "ATOM": "Cosmos",
    "NEAR": "NEAR Protocol",
    "ARB": "Arbitrum",
    "OP": "Optimism",
    "PEPE": "Pepe",
    "APT": "Aptos",
    "SUI": "Sui",
}


async def fetch_stock_price(symbol: str) -> Optional[dict]:
    """Fetch stock/ETF price from Yahoo Finance API with proper headers."""
    try:
        # Clean and format symbol
        symbol = symbol.strip().upper()

        # Use Yahoo Finance v8 API
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {
            "interval": "1d",
            "range": "1d",
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                params=params,
                headers=headers,
                timeout=8.0,
                follow_redirects=True
            )

            if response.status_code != 200:
                print(f"Yahoo Finance returned {response.status_code} for {symbol}")
                return None

            data = response.json()
            result = data.get("chart", {}).get("result")

            if not result or len(result) == 0:
                return None

            meta = result[0].get("meta", {})
            price = meta.get("regularMarketPrice")

            if not price:
                return None

            prev_close = meta.get("previousClose", price)
            change = price - prev_close if prev_close else 0
            change_percent = (change / prev_close * 100) if prev_close and prev_close > 0 else 0

            return {
                "symbol": symbol,
                "name": meta.get("shortName") or meta.get("longName") or symbol,
                "price": round(float(price), 2),
                "change": round(float(change), 2),
                "changePercent": round(float(change_percent), 2),
                "currency": meta.get("currency", "USD"),
                "type": "stock",
            }
    except asyncio.TimeoutError:
        print(f"Timeout fetching stock price for {symbol}")
        return None
    except Exception as e:
        print(f"Error fetching stock price for {symbol}: {e}")
        return None


async def fetch_crypto_price(symbol: str) -> Optional[dict]:
    """Fetch crypto price from CoinGecko API."""
    # Remove common suffixes
    clean_symbol = symbol.upper().replace("-USD", "").replace("USD", "").replace("-USDT", "").strip()

    # Get the CoinGecko ID
    coin_id = CRYPTO_SYMBOL_TO_ID.get(clean_symbol)

    if not coin_id:
        # Try lowercase as fallback
        coin_id = clean_symbol.lower()

    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": coin_id,
            "vs_currencies": "usd",
            "include_24hr_change": "true",
            "include_market_cap": "false",
        }
        headers = {
            "Accept": "application/json",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                params=params,
                headers=headers,
                timeout=8.0
            )

            if response.status_code == 429:
                print(f"CoinGecko rate limited for {symbol}")
                return None

            if response.status_code != 200:
                print(f"CoinGecko returned {response.status_code} for {symbol}")
                return None

            data = response.json()

            if not data or coin_id not in data:
                # Try searching by symbol if direct lookup fails
                return await search_crypto_by_symbol(clean_symbol)

            price = data[coin_id].get("usd")
            if price is None:
                return None

            change_percent = data[coin_id].get("usd_24h_change", 0) or 0

            # Get proper name
            name = CRYPTO_NAMES.get(clean_symbol, coin_id.replace("-", " ").title())

            return {
                "symbol": clean_symbol,
                "name": name,
                "price": round(float(price), 2) if price >= 1 else round(float(price), 6),
                "change": round(float(price * change_percent / 100), 2) if price >= 1 else round(float(price * change_percent / 100), 6),
                "changePercent": round(float(change_percent), 2),
                "currency": "USD",
                "type": "crypto",
            }
    except asyncio.TimeoutError:
        print(f"Timeout fetching crypto price for {symbol}")
        return None
    except Exception as e:
        print(f"Error fetching crypto price for {symbol}: {e}")
        return None


async def search_crypto_by_symbol(symbol: str) -> Optional[dict]:
    """Search for crypto by symbol using CoinGecko search endpoint."""
    try:
        url = "https://api.coingecko.com/api/v3/search"
        params = {"query": symbol}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=8.0)

            if response.status_code != 200:
                return None

            data = response.json()
            coins = data.get("coins", [])

            # Find exact symbol match
            for coin in coins[:10]:  # Check first 10 results
                if coin.get("symbol", "").upper() == symbol.upper():
                    coin_id = coin.get("id")
                    # Now fetch the price for this coin
                    return await fetch_crypto_by_id(coin_id, symbol, coin.get("name", symbol))

            return None
    except Exception as e:
        print(f"Error searching crypto for {symbol}: {e}")
        return None


async def fetch_crypto_by_id(coin_id: str, symbol: str, name: str) -> Optional[dict]:
    """Fetch crypto price by CoinGecko ID."""
    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": coin_id,
            "vs_currencies": "usd",
            "include_24hr_change": "true",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=8.0)

            if response.status_code != 200:
                return None

            data = response.json()

            if coin_id not in data:
                return None

            price = data[coin_id].get("usd")
            if price is None:
                return None

            change_percent = data[coin_id].get("usd_24h_change", 0) or 0

            return {
                "symbol": symbol.upper(),
                "name": name,
                "price": round(float(price), 2) if price >= 1 else round(float(price), 6),
                "change": round(float(price * change_percent / 100), 2) if price >= 1 else round(float(price * change_percent / 100), 6),
                "changePercent": round(float(change_percent), 2),
                "currency": "USD",
                "type": "crypto",
            }
    except Exception as e:
        print(f"Error fetching crypto by ID {coin_id}: {e}")
        return None


@router.get("", response_model=List[InvestmentHoldingResponse])
def get_holdings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all investment holdings for the current user."""
    holdings = db.query(InvestmentHolding).filter(
        InvestmentHolding.user_id == current_user.id
    ).all()
    return [InvestmentHoldingResponse.from_holding(h) for h in holdings]


@router.get("/summary")
def get_investment_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get investment portfolio summary."""
    holdings = db.query(InvestmentHolding).filter(
        InvestmentHolding.user_id == current_user.id
    ).all()

    total_value = sum((h.quantity or 0) * (h.current_price or 0) for h in holdings)
    total_cost = sum((h.quantity or 0) * (h.average_cost or 0) for h in holdings)
    total_gain = total_value - total_cost
    gain_percent = (total_gain / total_cost * 100) if total_cost > 0 else Decimal("0")

    # Group by type
    by_type = {}
    for h in holdings:
        asset_type = h.asset_type or "other"
        value = (h.quantity or 0) * (h.current_price or 0)
        by_type[asset_type] = by_type.get(asset_type, Decimal("0")) + value

    return {
        "total_value": total_value,
        "total_cost": total_cost,
        "total_gain_loss": total_gain,
        "gain_loss_percentage": gain_percent,
        "holdings_count": len(holdings),
        "by_type": by_type
    }


# ============ Real-time Price Endpoints (before dynamic routes) ============

@router.get("/lookup/{symbol}")
async def lookup_price(symbol: str, asset_type: Optional[str] = None):
    """Look up real-time price for a stock/ETF/crypto symbol.

    Args:
        symbol: The ticker symbol (e.g., AAPL, BTC, ETH)
        asset_type: Optional hint for asset type ('stock', 'crypto', etc.)
    """
    symbol = symbol.strip().upper()

    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol is required")

    # Known crypto symbols - check these first for crypto hints
    known_crypto = set(CRYPTO_SYMBOL_TO_ID.keys())

    result = None

    # If it's a known crypto symbol or asset_type is crypto, try crypto first
    if asset_type == "crypto" or symbol in known_crypto:
        result = await fetch_crypto_price(symbol)
        if not result:
            # Fallback to stock (some crypto like BTC-USD are on Yahoo)
            result = await fetch_stock_price(symbol)
    else:
        # Try both in parallel for faster response
        stock_task = asyncio.create_task(fetch_stock_price(symbol))
        crypto_task = asyncio.create_task(fetch_crypto_price(symbol))

        # Wait for stock result first (most common)
        stock_result = await stock_task

        if stock_result:
            result = stock_result
            # Cancel crypto task if stock succeeded
            crypto_task.cancel()
            try:
                await crypto_task
            except asyncio.CancelledError:
                pass
        else:
            # Wait for crypto result
            crypto_result = await crypto_task
            result = crypto_result

    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Could not find price data for symbol: {symbol}. "
                   f"Try using a valid stock ticker (AAPL, MSFT) or crypto symbol (BTC, ETH)."
        )

    return result


@router.get("/search/{query}")
async def search_symbols(query: str, include_prices: bool = True):
    """Search for stock or crypto symbols with optional price data."""
    query = query.strip().upper()

    if not query or len(query) < 1:
        raise HTTPException(status_code=400, detail="Search query is required")

    results = []
    crypto_results = []
    stock_results = []

    # Check if it matches known crypto symbols
    for symbol, coin_id in CRYPTO_SYMBOL_TO_ID.items():
        if query in symbol or query in coin_id.upper():
            name = CRYPTO_NAMES.get(symbol, coin_id.replace("-", " ").title())
            crypto_results.append({
                "symbol": f"{symbol}/USDT",
                "baseSymbol": symbol,
                "name": name,
                "type": "crypto",
                "coin_id": coin_id,
            })

    # Search Yahoo Finance for stocks
    try:
        url = "https://query1.finance.yahoo.com/v1/finance/search"
        params = {
            "q": query,
            "quotesCount": 10,
            "newsCount": 0,
            "enableFuzzyQuery": False,
            "quotesQueryId": "tss_match_phrase_query"
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, headers=headers, timeout=5.0)

            if response.status_code == 200:
                data = response.json()
                quotes = data.get("quotes", [])

                for quote in quotes[:10]:
                    q_type = quote.get("quoteType", "").lower()
                    if q_type in ["equity", "etf", "mutualfund", "index"]:
                        stock_results.append({
                            "symbol": quote.get("symbol", ""),
                            "baseSymbol": quote.get("symbol", ""),
                            "name": quote.get("shortname") or quote.get("longname", ""),
                            "type": "stock" if q_type == "equity" else q_type,
                            "exchange": quote.get("exchange", "")
                        })
    except Exception as e:
        print(f"Error searching Yahoo Finance: {e}")

    # Combine results - crypto first if query looks like crypto
    if len(query) <= 5:
        results = crypto_results + stock_results
    else:
        results = stock_results + crypto_results

    results = results[:15]

    # Fetch prices in parallel if requested
    if include_prices and results:
        async def get_price_for_result(item):
            try:
                if item["type"] == "crypto":
                    price_data = await fetch_crypto_price(item["baseSymbol"])
                else:
                    price_data = await fetch_stock_price(item["baseSymbol"])

                if price_data:
                    item["price"] = price_data["price"]
                    item["change"] = price_data["change"]
                    item["changePercent"] = price_data["changePercent"]
                return item
            except Exception:
                return item

        # Fetch prices for first 8 results to avoid rate limiting
        tasks = [get_price_for_result(r) for r in results[:8]]
        results_with_prices = await asyncio.gather(*tasks)
        results = list(results_with_prices) + results[8:]

    return {"results": results}


@router.get("/chart/{symbol}")
async def get_price_chart(
    symbol: str,
    period: str = "1d",
    interval: Optional[str] = None,
    asset_type: Optional[str] = None,
    max_candles: int = 0
):
    """Get historical price data for charting.

    Args:
        symbol: The ticker symbol
        period: Time period - 1d, 5d, 1m, 3m, 6m, 1y, 5y
        interval: Optional candle interval - 1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d
        asset_type: Optional hint for asset type
        max_candles: Maximum number of candles to fetch (0 = default based on period)
    """
    symbol = symbol.strip().upper()
    known_crypto = set(CRYPTO_SYMBOL_TO_ID.keys())

    # Check cache first (include max_candles in key)
    cache_key = f"chart_{symbol}_{period}_{interval}_{asset_type}_{max_candles}"
    cached = chart_cache.get(cache_key)
    if cached:
        return cached

    # Map user-friendly intervals to Yahoo Finance intervals
    interval_map = {
        "1m": "1m",
        "3m": "5m",  # Yahoo doesn't have 3m, use 5m
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "1h",
        "4h": "1h",  # Yahoo doesn't have 4h, use 1h
        "1d": "1d",
        "1w": "1wk",  # Yahoo uses 1wk for weekly
        "1M": "1mo",  # Yahoo uses 1mo for monthly
    }

    # Map period to Yahoo Finance range (default intervals if not specified)
    period_map = {
        "1d": ("1d", "5m"),
        "5d": ("5d", "15m"),
        "1m": ("1mo", "1h"),
        "3m": ("3mo", "1d"),
        "6m": ("6mo", "1d"),
        "1y": ("1y", "1wk"),
        "5y": ("5y", "1mo"),
    }

    range_val, default_interval = period_map.get(period, ("1mo", "1d"))

    # Use provided interval or default based on period
    if interval and interval in interval_map:
        yahoo_interval = interval_map[interval]
    else:
        yahoo_interval = default_interval

    # For crypto, use Binance/CoinGecko
    if asset_type == "crypto" or symbol in known_crypto:
        result = await get_crypto_chart(symbol, period, interval, max_candles)
        if result and result.get("data"):
            # Cache for shorter time for real-time data (10s for 1m/3m/5m intervals)
            cache_ttl = 10 if interval in ["1m", "3m", "5m"] else 60
            chart_cache.set(cache_key, result, cache_ttl)
        return result

    # For stocks, use Yahoo Finance with multiple fallback attempts
    last_error = None
    for attempt in range(3):
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
            params = {
                "interval": yahoo_interval,
                "range": range_val,
            }
            # Rotate user agents to avoid rate limiting
            user_agents = [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
            ]
            headers = {
                "User-Agent": user_agents[attempt % len(user_agents)],
                "Accept": "application/json",
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, headers=headers, timeout=15.0)

                if response.status_code == 429:
                    # Rate limited - wait and retry
                    if attempt < 2:
                        await asyncio.sleep(2)
                        continue
                    raise HTTPException(status_code=429, detail="Rate limited. Please try again in a moment.")

                if response.status_code != 200:
                    last_error = f"Yahoo Finance returned {response.status_code}"
                    if attempt < 2:
                        await asyncio.sleep(1)
                        continue
                    raise HTTPException(status_code=404, detail="Chart data not found")

                data = response.json()
                result = data.get("chart", {}).get("result", [])

                if not result:
                    last_error = "Empty result from Yahoo Finance"
                    if attempt < 2:
                        await asyncio.sleep(1)
                        continue
                    raise HTTPException(status_code=404, detail="Chart data not found")

                timestamps = result[0].get("timestamp", [])
                if not timestamps:
                    last_error = "No timestamps in Yahoo Finance response"
                    if attempt < 2:
                        await asyncio.sleep(1)
                        continue
                    raise HTTPException(status_code=404, detail="Chart data not found")

                indicators = result[0].get("indicators", {}).get("quote", [{}])[0]
                opens = indicators.get("open", [])
                highs = indicators.get("high", [])
                lows = indicators.get("low", [])
                closes = indicators.get("close", [])
                volumes = indicators.get("volume", [])
                meta = result[0].get("meta", {})

                # Build chart data with OHLC
                chart_data = []
                for i, ts in enumerate(timestamps):
                    if i < len(closes) and closes[i] is not None:
                        chart_data.append({
                            "timestamp": ts * 1000,  # Convert to milliseconds
                            "price": round(closes[i], 2),
                            "open": round(opens[i], 2) if opens and i < len(opens) and opens[i] else round(closes[i], 2),
                            "high": round(highs[i], 2) if highs and i < len(highs) and highs[i] else round(closes[i], 2),
                            "low": round(lows[i], 2) if lows and i < len(lows) and lows[i] else round(closes[i], 2),
                            "close": round(closes[i], 2),
                            "volume": int(volumes[i]) if volumes and i < len(volumes) and volumes[i] else 0,
                        })

                result_data = {
                    "symbol": symbol,
                    "name": meta.get("shortName", symbol),
                    "currency": meta.get("currency", "USD"),
                    "period": period,
                    "interval": yahoo_interval,
                    "data": chart_data,
                    "currentPrice": meta.get("regularMarketPrice"),
                    "previousClose": meta.get("previousClose"),
                }

                # Cache the result
                if chart_data:
                    cache_ttl = 60 if interval in ["1m", "3m", "5m"] else 300
                    chart_cache.set(cache_key, result_data, cache_ttl)

                return result_data

        except HTTPException:
            raise
        except Exception as e:
            last_error = str(e)
            if attempt < 2:
                await asyncio.sleep(1)
                continue
            print(f"Error fetching chart for {symbol}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch chart data: {last_error}")


async def get_crypto_chart_binance(symbol: str, period: str, interval: Optional[str] = None, max_candles: int = 0) -> Optional[dict]:
    """Get crypto chart data from Binance API (better data, more candles).

    Args:
        symbol: Crypto symbol (e.g., BTC, ETH)
        period: Time period (1d, 5d, 1m, 3m, 6m, 1y, 5y)
        interval: Candle interval (1m, 5m, 15m, 1h, 4h, 1d)
        max_candles: If > 0, fetch up to this many candles (makes multiple API calls if needed)
    """
    # Map symbol to Binance trading pair
    binance_symbol = f"{symbol}USDT"

    # Map interval to Binance interval format
    binance_interval_map = {
        "1m": "1m",
        "3m": "3m",
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "1h",
        "4h": "4h",
        "1d": "1d",
        "1w": "1w",
        "1M": "1M",
    }

    # Determine interval and limit based on period - increased limits
    period_config = {
        "1d": {"interval": "5m", "limit": 288},      # 288 x 5min = 24 hours
        "5d": {"interval": "15m", "limit": 480},     # 480 x 15min = 5 days
        "1m": {"interval": "1h", "limit": 720},      # 720 x 1hr = 30 days
        "3m": {"interval": "4h", "limit": 540},      # 540 x 4hr = 90 days
        "6m": {"interval": "4h", "limit": 1000},     # ~166 days worth
        "1y": {"interval": "1d", "limit": 365},      # 365 days
        "5y": {"interval": "1d", "limit": 1000},     # Max 1000 per call
    }

    config = period_config.get(period, {"interval": "1h", "limit": 1000})

    # Override with user-specified interval if provided
    if interval and interval in binance_interval_map:
        config["interval"] = binance_interval_map[interval]
        # Use max limit for user-specified intervals
        config["limit"] = 1000  # Binance max per call

    # Calculate how many candles to fetch
    target_limit = max_candles if max_candles > 0 else config["limit"]

    try:
        url = "https://api.binance.com/api/v3/klines"
        all_candles = []

        async with httpx.AsyncClient() as client:
            # Binance max is 1000 per request, so we may need multiple calls
            remaining = target_limit
            end_time = None

            while remaining > 0:
                batch_limit = min(1000, remaining)
                params = {
                    "symbol": binance_symbol,
                    "interval": config["interval"],
                    "limit": batch_limit,
                }
                if end_time:
                    params["endTime"] = end_time - 1  # Exclude last candle from previous batch

                response = await client.get(url, params=params, timeout=15.0)

                if response.status_code != 200:
                    print(f"Binance returned {response.status_code} for {symbol}")
                    if all_candles:
                        break  # Return what we have so far
                    return None

                data = response.json()
                if not data:
                    break

                # Prepend to get chronological order (we're fetching backwards)
                batch_data = []
                for candle in data:
                    ts = int(candle[0])
                    o = float(candle[1])
                    h = float(candle[2])
                    l = float(candle[3])
                    c = float(candle[4])
                    v = float(candle[5])

                    # Round based on price magnitude
                    decimals = 6 if c < 1 else (4 if c < 100 else 2)

                    batch_data.append({
                        "timestamp": ts,
                        "price": round(c, decimals),
                        "open": round(o, decimals),
                        "high": round(h, decimals),
                        "low": round(l, decimals),
                        "close": round(c, decimals),
                        "volume": round(v, 2),
                    })

                if end_time is None:
                    # First batch - just add all
                    all_candles = batch_data
                else:
                    # Subsequent batches - prepend
                    all_candles = batch_data + all_candles

                remaining -= len(data)

                # If we got fewer than requested, we've reached the beginning
                if len(data) < batch_limit:
                    break

                # Set end_time for next batch (earliest timestamp from this batch)
                end_time = int(data[0][0])

                # Safety: max 3 API calls (3000 candles)
                if target_limit > 3000 and len(all_candles) >= 3000:
                    break

            if not all_candles:
                return None

            current_price = all_candles[-1]["close"] if all_candles else None

            return {
                "symbol": f"{symbol}/USDT",
                "name": CRYPTO_NAMES.get(symbol, symbol),
                "currency": "USD",
                "period": period,
                "interval": config["interval"],
                "data": all_candles,
                "currentPrice": current_price,
                "type": "crypto",
                "source": "binance",
                "totalCandles": len(all_candles),
            }

    except Exception as e:
        print(f"Binance API error for {symbol}: {e}")
        return None


async def get_crypto_chart(symbol: str, period: str, interval: Optional[str] = None, max_candles: int = 0) -> dict:
    """Get crypto chart data - tries Binance first (better data), falls back to CoinGecko."""

    # Try Binance first (more data, no rate limits)
    binance_data = await get_crypto_chart_binance(symbol, period, interval, max_candles)
    if binance_data and binance_data.get("data"):
        return binance_data

    print(f"Binance failed for {symbol}, trying CoinGecko...")

    # Fallback to CoinGecko
    coin_id = CRYPTO_SYMBOL_TO_ID.get(symbol, symbol.lower())

    # Map period to CoinGecko days
    days_map = {
        "1d": 1,
        "5d": 5,
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365,
        "5y": 1825,
    }
    days = days_map.get(period, 30)

    # For shorter intervals on 1d period, use more granular data
    if interval in ["1m", "3m", "5m"] and period == "1d":
        days = 1  # CoinGecko gives 5-minute data for 1 day

    # Try OHLC endpoint first (better for candlestick charts)
    # CoinGecko OHLC only supports: 1, 7, 14, 30, 90, 180, 365 days
    ohlc_days_map = {1: 1, 5: 7, 30: 30, 90: 90, 180: 180, 365: 365, 1825: 365}
    ohlc_days = ohlc_days_map.get(days, 30)

    last_error = None

    for attempt in range(3):
        try:
            async with httpx.AsyncClient() as client:
                # Try OHLC endpoint
                ohlc_url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/ohlc"
                ohlc_params = {"vs_currency": "usd", "days": ohlc_days}

                response = await client.get(ohlc_url, params=ohlc_params, timeout=20.0)

                # Handle rate limiting with retry
                if response.status_code == 429:
                    if attempt < 2:
                        wait_time = 3 * (attempt + 1)  # 3, 6 seconds
                        print(f"CoinGecko rate limited for {symbol}, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue

                if response.status_code == 200:
                    ohlc_data = response.json()
                    if ohlc_data and len(ohlc_data) > 0:
                        # OHLC format: [timestamp, open, high, low, close]
                        chart_data = []
                        for candle in ohlc_data:
                            if len(candle) >= 5:
                                ts, o, h, l, c = candle[0], candle[1], candle[2], candle[3], candle[4]
                                chart_data.append({
                                    "timestamp": int(ts),
                                    "price": round(c, 6) if c < 1 else round(c, 2),
                                    "open": round(o, 6) if o < 1 else round(o, 2),
                                    "high": round(h, 6) if h < 1 else round(h, 2),
                                    "low": round(l, 6) if l < 1 else round(l, 2),
                                    "close": round(c, 6) if c < 1 else round(c, 2),
                                })

                        current_price = chart_data[-1]["close"] if chart_data else None

                        return {
                            "symbol": f"{symbol}/USDT",
                            "name": CRYPTO_NAMES.get(symbol, coin_id.replace("-", " ").title()),
                            "currency": "USD",
                            "period": period,
                            "interval": interval or "auto",
                            "data": chart_data,
                            "currentPrice": current_price,
                            "type": "crypto",
                        }

                # Fallback to market_chart if OHLC fails (rate limited or unavailable)
                print(f"OHLC failed for {symbol}, falling back to market_chart")
                url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart"
                params = {"vs_currency": "usd", "days": days}

                response = await client.get(url, params=params, timeout=20.0)

                if response.status_code == 429:
                    if attempt < 2:
                        wait_time = 3 * (attempt + 1)
                        print(f"CoinGecko rate limited for {symbol}, waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    # Final attempt - return empty but valid response
                    print(f"Rate limited for {symbol} after retries")
                    return {
                        "symbol": f"{symbol}/USDT",
                        "name": CRYPTO_NAMES.get(symbol, coin_id.replace("-", " ").title()),
                        "currency": "USD",
                        "period": period,
                        "data": [],
                        "currentPrice": None,
                        "type": "crypto",
                        "error": "Rate limited, please try again later",
                    }

                if response.status_code != 200:
                    last_error = f"CoinGecko returned {response.status_code}"
                    if attempt < 2:
                        await asyncio.sleep(2)
                        continue
                    raise HTTPException(status_code=404, detail=f"Chart data not found (status: {response.status_code})")

                data = response.json()
                prices = data.get("prices", [])

                if not prices:
                    last_error = "Empty prices from CoinGecko"
                    if attempt < 2:
                        await asyncio.sleep(2)
                        continue

                # Generate OHLC from price data by grouping
                chart_data = []
                for i, p in enumerate(prices):
                    price = round(p[1], 6) if p[1] < 1 else round(p[1], 2)
                    prev_price = round(prices[i-1][1], 6) if i > 0 and prices[i-1][1] < 1 else round(prices[i-1][1], 2) if i > 0 else price

                    # Calculate realistic OHLC
                    open_p = prev_price
                    close_p = price
                    movement = abs(close_p - open_p)
                    volatility = max(movement * 0.3, price * 0.001)

                    high_p = max(open_p, close_p) + volatility
                    low_p = min(open_p, close_p) - volatility

                    chart_data.append({
                        "timestamp": int(p[0]),
                        "price": price,
                        "open": open_p,
                        "high": round(high_p, 6) if high_p < 1 else round(high_p, 2),
                        "low": round(low_p, 6) if low_p < 1 else round(low_p, 2),
                        "close": close_p,
                    })

                current_price = chart_data[-1]["close"] if chart_data else None

                return {
                    "symbol": f"{symbol}/USDT",
                    "name": CRYPTO_NAMES.get(symbol, coin_id.replace("-", " ").title()),
                    "currency": "USD",
                    "period": period,
                    "interval": interval or "auto",
                    "data": chart_data,
                    "currentPrice": current_price,
                    "type": "crypto",
                }

        except HTTPException:
            raise
        except Exception as e:
            last_error = str(e)
            if attempt < 2:
                await asyncio.sleep(2)
                continue
            print(f"Error fetching crypto chart for {symbol}: {e}")

    # All retries failed - return empty data instead of error to prevent UI breaking
    return {
        "symbol": f"{symbol}/USDT",
        "name": CRYPTO_NAMES.get(symbol, symbol),
        "currency": "USD",
        "period": period,
        "data": [],
        "currentPrice": None,
        "type": "crypto",
        "error": last_error or "Failed to fetch data",
    }


@router.post("/refresh-prices")
async def refresh_all_prices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Refresh prices for all user's holdings from real-time data."""
    holdings = db.query(InvestmentHolding).filter(
        InvestmentHolding.user_id == current_user.id
    ).all()

    if not holdings:
        return {"updated": 0, "failed": 0, "updates": []}

    updated = 0
    failed = 0
    updates = []
    errors = []

    # Process holdings with concurrency limit to avoid rate limiting
    async def fetch_price(holding):
        symbol = holding.symbol.strip().upper()
        asset_type = holding.asset_type or "other"

        # Check known crypto symbols
        known_crypto = set(CRYPTO_SYMBOL_TO_ID.keys())

        result = None
        if asset_type == "crypto" or symbol in known_crypto:
            result = await fetch_crypto_price(symbol)
            if not result:
                result = await fetch_stock_price(symbol)
        else:
            result = await fetch_stock_price(symbol)
            if not result:
                result = await fetch_crypto_price(symbol)

        return holding, result

    # Process in batches of 5 to avoid rate limiting
    batch_size = 5
    for i in range(0, len(holdings), batch_size):
        batch = holdings[i:i + batch_size]
        tasks = [fetch_price(h) for h in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for item in results:
            if isinstance(item, Exception):
                failed += 1
                errors.append(str(item))
                continue

            holding, result = item

            if result:
                old_price = float(holding.current_price) if holding.current_price else 0
                new_price = result["price"]
                holding.current_price = Decimal(str(new_price))
                updates.append({
                    "id": holding.id,
                    "symbol": holding.symbol.upper(),
                    "name": result.get("name", holding.name),
                    "old_price": old_price,
                    "new_price": new_price,
                    "change": result["change"],
                    "changePercent": result["changePercent"],
                })
                updated += 1
            else:
                failed += 1
                errors.append(f"No data for {holding.symbol}")

        # Small delay between batches to avoid rate limiting
        if i + batch_size < len(holdings):
            await asyncio.sleep(0.3)

    if updated > 0:
        db.commit()

    return {
        "updated": updated,
        "failed": failed,
        "updates": updates,
        "errors": errors[:5] if errors else [],  # Only return first 5 errors
    }


# ============ Dynamic Routes (must come after static routes) ============

@router.get("/{holding_id}", response_model=InvestmentHoldingResponse)
def get_holding_by_id(
    holding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific investment holding."""
    holding = db.query(InvestmentHolding).filter(
        InvestmentHolding.id == holding_id,
        InvestmentHolding.user_id == current_user.id
    ).first()

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    return InvestmentHoldingResponse.from_holding(holding)


@router.post("", response_model=InvestmentHoldingResponse)
def create_holding(
    holding_in: InvestmentHoldingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new investment holding."""
    data = holding_in.model_dump()
    # Map holding_type to asset_type for the database model
    if 'holding_type' in data:
        holding_type = data.pop('holding_type')
        data['asset_type'] = holding_type.value if holding_type else None

    holding = InvestmentHolding(
        user_id=current_user.id,
        **data
    )
    db.add(holding)
    db.commit()
    db.refresh(holding)
    return InvestmentHoldingResponse.from_holding(holding)


@router.put("/{holding_id}", response_model=InvestmentHoldingResponse)
def update_holding(
    holding_id: int,
    holding_in: InvestmentHoldingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an investment holding."""
    holding = db.query(InvestmentHolding).filter(
        InvestmentHolding.id == holding_id,
        InvestmentHolding.user_id == current_user.id
    ).first()

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    update_data = holding_in.model_dump(exclude_unset=True)
    # Map holding_type to asset_type for the database model
    if 'holding_type' in update_data:
        holding_type = update_data.pop('holding_type')
        update_data['asset_type'] = holding_type.value if holding_type else None

    for field, value in update_data.items():
        setattr(holding, field, value)

    db.commit()
    db.refresh(holding)
    return InvestmentHoldingResponse.from_holding(holding)


@router.delete("/{holding_id}")
def delete_holding(
    holding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an investment holding."""
    holding = db.query(InvestmentHolding).filter(
        InvestmentHolding.id == holding_id,
        InvestmentHolding.user_id == current_user.id
    ).first()

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    db.delete(holding)
    db.commit()
    return {"message": "Holding deleted successfully"}


# ============ Transactions ============

@router.get("/{holding_id}/transactions", response_model=List[InvestmentTransactionResponse])
def get_holding_transactions(
    holding_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all transactions for a holding."""
    holding = db.query(InvestmentHolding).filter(
        InvestmentHolding.id == holding_id,
        InvestmentHolding.user_id == current_user.id
    ).first()

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    return db.query(InvestmentTransaction).filter(
        InvestmentTransaction.holding_id == holding_id,
        InvestmentTransaction.user_id == current_user.id
    ).order_by(InvestmentTransaction.date.desc()).all()


@router.post("/transactions", response_model=InvestmentTransactionResponse)
def create_transaction(
    transaction_in: InvestmentTransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new investment transaction."""
    holding = db.query(InvestmentHolding).filter(
        InvestmentHolding.id == transaction_in.holding_id,
        InvestmentHolding.user_id == current_user.id
    ).first()

    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    transaction = InvestmentTransaction(
        user_id=current_user.id,
        **transaction_in.model_dump()
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


# ============ Favorite Assets Endpoints ============

@router.get("/favorites", response_model=List[FavoriteAssetResponse])
def get_favorites(
    asset_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's favorite/watchlist assets."""
    query = db.query(FavoriteAsset).filter(FavoriteAsset.user_id == current_user.id)
    if asset_type:
        query = query.filter(FavoriteAsset.asset_type == asset_type)
    return query.order_by(FavoriteAsset.display_order, FavoriteAsset.created_at).all()


@router.post("/favorites", response_model=FavoriteAssetResponse)
def add_favorite(
    favorite_in: FavoriteAssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add an asset to user's favorites/watchlist."""
    # Check if already exists
    existing = db.query(FavoriteAsset).filter(
        FavoriteAsset.user_id == current_user.id,
        FavoriteAsset.symbol == favorite_in.symbol.upper()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset already in favorites")

    # Get the next display order
    max_order = db.query(FavoriteAsset).filter(
        FavoriteAsset.user_id == current_user.id
    ).count()

    favorite = FavoriteAsset(
        user_id=current_user.id,
        symbol=favorite_in.symbol.upper(),
        name=favorite_in.name,
        asset_type=favorite_in.asset_type,
        display_order=max_order
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


@router.delete("/favorites/{symbol}")
def remove_favorite(
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove an asset from user's favorites/watchlist."""
    favorite = db.query(FavoriteAsset).filter(
        FavoriteAsset.user_id == current_user.id,
        FavoriteAsset.symbol == symbol.upper()
    ).first()
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    db.delete(favorite)
    db.commit()
    return {"message": "Favorite removed"}


@router.put("/favorites/{symbol}", response_model=FavoriteAssetResponse)
def update_favorite(
    symbol: str,
    favorite_in: FavoriteAssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a favorite asset (e.g., display order)."""
    favorite = db.query(FavoriteAsset).filter(
        FavoriteAsset.user_id == current_user.id,
        FavoriteAsset.symbol == symbol.upper()
    ).first()
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    for field, value in favorite_in.model_dump(exclude_unset=True).items():
        setattr(favorite, field, value)

    db.commit()
    db.refresh(favorite)
    return favorite


@router.post("/favorites/reorder")
def reorder_favorites(
    order: List[str],  # List of symbols in new order
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder user's favorite assets."""
    favorites = db.query(FavoriteAsset).filter(
        FavoriteAsset.user_id == current_user.id
    ).all()

    symbol_to_fav = {f.symbol: f for f in favorites}

    for i, symbol in enumerate(order):
        if symbol.upper() in symbol_to_fav:
            symbol_to_fav[symbol.upper()].display_order = i

    db.commit()
    return {"message": "Favorites reordered"}


# ============ User Investment Settings Endpoints ============

@router.get("/settings", response_model=UserInvestmentSettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's investment page settings."""
    settings = db.query(UserInvestmentSettings).filter(
        UserInvestmentSettings.user_id == current_user.id
    ).first()

    # Create default settings if none exist
    if not settings:
        settings = UserInvestmentSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return settings


@router.put("/settings", response_model=UserInvestmentSettingsResponse)
def update_settings(
    settings_in: UserInvestmentSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update user's investment page settings."""
    settings = db.query(UserInvestmentSettings).filter(
        UserInvestmentSettings.user_id == current_user.id
    ).first()

    # Create if doesn't exist
    if not settings:
        settings = UserInvestmentSettings(user_id=current_user.id)
        db.add(settings)

    # Update fields
    for field, value in settings_in.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings


# ============ Popular Assets by Category ============

POPULAR_ASSETS_BY_TYPE = {
    "crypto": [
        {"symbol": "BTC", "name": "Bitcoin", "icon": "₿"},
        {"symbol": "ETH", "name": "Ethereum", "icon": "Ξ"},
        {"symbol": "SOL", "name": "Solana", "icon": "◎"},
        {"symbol": "XRP", "name": "XRP", "icon": "✕"},
        {"symbol": "DOGE", "name": "Dogecoin", "icon": "Ð"},
        {"symbol": "LTC", "name": "Litecoin", "icon": "Ł"},
        {"symbol": "ADA", "name": "Cardano", "icon": "₳"},
        {"symbol": "AVAX", "name": "Avalanche", "icon": "🔺"},
        {"symbol": "DOT", "name": "Polkadot", "icon": "●"},
        {"symbol": "MATIC", "name": "Polygon", "icon": "⬡"},
    ],
    "stock": [
        {"symbol": "AAPL", "name": "Apple Inc.", "icon": ""},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "icon": "𝐆"},
        {"symbol": "MSFT", "name": "Microsoft Corp.", "icon": ""},
        {"symbol": "TSLA", "name": "Tesla Inc.", "icon": "⚡"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "icon": ""},
        {"symbol": "NVDA", "name": "NVIDIA Corp.", "icon": ""},
        {"symbol": "META", "name": "Meta Platforms", "icon": ""},
        {"symbol": "NFLX", "name": "Netflix Inc.", "icon": ""},
        {"symbol": "AMD", "name": "AMD Inc.", "icon": ""},
        {"symbol": "DIS", "name": "Walt Disney Co.", "icon": ""},
    ],
    "etf": [
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "icon": ""},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust", "icon": ""},
        {"symbol": "VTI", "name": "Vanguard Total Stock", "icon": ""},
        {"symbol": "VOO", "name": "Vanguard S&P 500", "icon": ""},
        {"symbol": "IWM", "name": "iShares Russell 2000", "icon": ""},
        {"symbol": "EEM", "name": "iShares Emerging Markets", "icon": ""},
        {"symbol": "GLD", "name": "SPDR Gold Shares", "icon": "🥇"},
        {"symbol": "SLV", "name": "iShares Silver Trust", "icon": "🥈"},
    ],
    "bond": [
        {"symbol": "BND", "name": "Vanguard Total Bond", "icon": ""},
        {"symbol": "TLT", "name": "iShares 20+ Year Treasury", "icon": ""},
        {"symbol": "AGG", "name": "iShares Core US Aggregate", "icon": ""},
        {"symbol": "LQD", "name": "iShares Investment Grade Corp", "icon": ""},
        {"symbol": "HYG", "name": "iShares High Yield Corp", "icon": ""},
    ],
    "reit": [
        {"symbol": "VNQ", "name": "Vanguard Real Estate ETF", "icon": "🏢"},
        {"symbol": "O", "name": "Realty Income Corp.", "icon": ""},
        {"symbol": "SPG", "name": "Simon Property Group", "icon": ""},
        {"symbol": "AMT", "name": "American Tower Corp.", "icon": "📡"},
        {"symbol": "PLD", "name": "Prologis Inc.", "icon": ""},
    ],
}


@router.get("/popular/{asset_type}")
def get_popular_assets(
    asset_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get popular/hot assets for a specific category, merged with user's favorites."""
    # Get user's favorites for this type
    user_favorites = db.query(FavoriteAsset).filter(
        FavoriteAsset.user_id == current_user.id,
        FavoriteAsset.asset_type == asset_type
    ).order_by(FavoriteAsset.display_order).all()

    favorite_symbols = {f.symbol for f in user_favorites}

    # Get popular assets for this type
    popular = POPULAR_ASSETS_BY_TYPE.get(asset_type, [])

    # Mark which ones are favorites
    result = {
        "favorites": [
            {
                "symbol": f.symbol,
                "name": f.name,
                "asset_type": f.asset_type,
                "is_favorite": True,
            }
            for f in user_favorites
        ],
        "popular": [
            {
                **asset,
                "asset_type": asset_type,
                "is_favorite": asset["symbol"] in favorite_symbols,
            }
            for asset in popular
        ],
    }

    return result
