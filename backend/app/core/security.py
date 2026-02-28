import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from jose import jwt, JWTError
import bcrypt
from fastapi import Request
from .config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    password_bytes = plain_password.encode("utf-8")[:72]
    hash_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hash_bytes)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    password_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def hash_ip(ip: str) -> str:
    """Create a SHA-256 hash of an IP address for storage in JWT."""
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def get_client_ip(request: Request) -> Optional[str]:
    """Get the real client IP, respecting proxy headers.

    Checks X-Forwarded-For (set by the MatrixAuth proxy) first,
    then falls back to the direct connection IP.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
        # The first one is the real client IP
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None


def create_access_token(
    subject: str | int,
    expires_delta: Optional[timedelta] = None,
    additional_claims: Optional[dict[str, Any]] = None,
    client_ip: Optional[str] = None,
    ip_binding: bool = False,
) -> str:
    """Create a JWT access token with iat and optional IP binding."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: dict[str, Any] = {
        "exp": expire,
        "iat": now,
        "sub": str(subject),
        "type": "access",
    }
    if ip_binding and client_ip:
        to_encode["ip"] = hash_ip(client_ip)
    if additional_claims:
        to_encode.update(additional_claims)

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(
    subject: str | int,
    expires_delta: Optional[timedelta] = None,
    client_ip: Optional[str] = None,
    ip_binding: bool = False,
) -> str:
    """Create a JWT refresh token with iat and optional IP binding."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode: dict[str, Any] = {
        "exp": expire,
        "iat": now,
        "sub": str(subject),
        "type": "refresh",
    }
    if ip_binding and client_ip:
        to_encode["ip"] = hash_ip(client_ip)

    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
