"""System settings service with in-memory caching."""
import time
from typing import Optional
from sqlalchemy.orm import Session
from app.models.system_settings import SystemSetting

# Default security settings
DEFAULTS = {
    "access_token_expire_minutes": "30",
    "refresh_token_expire_days": "7",
    "ip_binding_enabled": "false",
}

# Simple in-memory cache: {key: (value, timestamp)}
_cache: dict[str, tuple[str, float]] = {}
_CACHE_TTL = 60  # seconds


def get_setting(db: Session, key: str) -> str:
    """Get a system setting value, using cache when available."""
    now = time.time()

    # Check cache
    if key in _cache:
        value, cached_at = _cache[key]
        if now - cached_at < _CACHE_TTL:
            return value

    # Read from DB
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row:
        _cache[key] = (row.value, now)
        return row.value

    # Return default
    default = DEFAULTS.get(key, "")
    _cache[key] = (default, now)
    return default


def set_setting(db: Session, key: str, value: str) -> None:
    """Set a system setting value."""
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if row:
        row.value = value
    else:
        row = SystemSetting(key=key, value=value)
        db.add(row)
    db.commit()

    # Update cache
    _cache[key] = (value, time.time())


def get_all_security_settings(db: Session) -> dict[str, str]:
    """Get all security-related settings."""
    return {
        "access_token_expire_minutes": get_setting(db, "access_token_expire_minutes"),
        "refresh_token_expire_days": get_setting(db, "refresh_token_expire_days"),
        "ip_binding_enabled": get_setting(db, "ip_binding_enabled"),
    }


def get_access_token_minutes(db: Session) -> int:
    """Get access token expiry in minutes."""
    return int(get_setting(db, "access_token_expire_minutes"))


def get_refresh_token_days(db: Session) -> int:
    """Get refresh token expiry in days."""
    return int(get_setting(db, "refresh_token_expire_days"))


def is_ip_binding_enabled(db: Session) -> bool:
    """Check if IP binding is enabled."""
    return get_setting(db, "ip_binding_enabled").lower() == "true"


def invalidate_cache() -> None:
    """Clear the settings cache."""
    _cache.clear()
