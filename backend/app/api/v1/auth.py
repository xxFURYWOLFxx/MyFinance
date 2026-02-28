import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_client_ip,
)
from app.core.system_settings import (
    get_access_token_minutes,
    get_refresh_token_days,
    is_ip_binding_enabled,
)
from app.models.user import User, UserRole, PasswordResetToken, EmailVerificationToken
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    Token,
    LoginRequest,
    PasswordChange,
    PasswordResetRequest,
    PasswordReset,
    EmailVerificationRequest,
    ResendVerificationRequest,
)
from app.schemas.common import MessageResponse
from app.api.deps import get_current_user
from app.services.email import send_password_reset_email, send_verification_email
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _create_and_send_verification(db: Session, user: User) -> None:
    """Generate a verification token and send the verification email."""
    # Invalidate any existing unused tokens
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.used == False,
    ).update({"used": True})

    token = secrets.token_urlsafe(32)
    verification_token = EmailVerificationToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
    )
    db.add(verification_token)
    db.commit()

    send_verification_email(db, user.email, token)


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user. Sends verification email."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if this is the first user (make them admin + skip verification)
    user_count = db.query(User).count()
    is_first_user = user_count == 0
    role = UserRole.ADMIN if is_first_user else UserRole.USER

    # Create new user
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=role,
        email_verified=is_first_user,  # First user is auto-verified
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send verification email for non-first users
    if not is_first_user:
        _create_and_send_verification(db, user)
        return MessageResponse(
            message="Account created. Please check your email to verify your address."
        )

    return MessageResponse(message="Admin account created. You can now log in.")


@router.post("/login", response_model=Token)
def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    """Login and get access token."""
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Check email verification
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your inbox for the verification link.",
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Read security settings from DB
    access_minutes = get_access_token_minutes(db)
    refresh_days = get_refresh_token_days(db)
    ip_binding = is_ip_binding_enabled(db)
    client_ip = get_client_ip(request)

    return Token(
        access_token=create_access_token(
            user.id,
            expires_delta=timedelta(minutes=access_minutes),
            client_ip=client_ip,
            ip_binding=ip_binding,
        ),
        refresh_token=create_refresh_token(
            user.id,
            expires_delta=timedelta(days=refresh_days),
            client_ip=client_ip,
            ip_binding=ip_binding,
        ),
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(data: EmailVerificationRequest, db: Session = Depends(get_db)):
    """Verify email address using the token from the verification email."""
    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == data.token,
        EmailVerificationToken.used == False,
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link",
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    token_expiry = token_record.expires_at
    if token_expiry.tzinfo is None:
        token_expiry = token_expiry.replace(tzinfo=timezone.utc)
    if now > token_expiry:
        token_record.used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link has expired. Please request a new one.",
        )

    # Find user and verify
    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification link",
        )

    user.email_verified = True
    token_record.used = True
    db.commit()

    return MessageResponse(message="Email verified successfully. You can now log in.")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(data: ResendVerificationRequest, db: Session = Depends(get_db)):
    """Resend the verification email."""
    user = db.query(User).filter(User.email == data.email).first()

    # Always return success to prevent email enumeration
    if user and user.is_active and not user.email_verified:
        _create_and_send_verification(db, user)

    return MessageResponse(
        message="If the email exists and is not yet verified, a new verification link has been sent."
    )


@router.post("/refresh", response_model=Token)
def refresh_token(request: Request, refresh_token: str, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    payload = decode_token(refresh_token)

    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Read security settings from DB
    access_minutes = get_access_token_minutes(db)
    refresh_days = get_refresh_token_days(db)
    ip_binding = is_ip_binding_enabled(db)
    client_ip = get_client_ip(request)

    return Token(
        access_token=create_access_token(
            user.id,
            expires_delta=timedelta(minutes=access_minutes),
            client_ip=client_ip,
            ip_binding=ip_binding,
        ),
        refresh_token=create_refresh_token(
            user.id,
            expires_delta=timedelta(days=refresh_days),
            client_ip=client_ip,
            ip_binding=ip_binding,
        ),
    )


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """Logout current user."""
    return MessageResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update current user profile."""
    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)

    return current_user


@router.put("/change-password", response_model=MessageResponse)
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change current user's password."""
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return MessageResponse(message="Password updated successfully")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: PasswordResetRequest, db: Session = Depends(get_db)):
    """Request password reset email."""
    user = db.query(User).filter(User.email == data.email).first()

    # Always return success to prevent email enumeration
    if user and user.is_active:
        # Invalidate any existing unused tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
        ).update({"used": True})

        # Generate a new token
        token = secrets.token_urlsafe(32)
        reset_token = PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        db.add(reset_token)
        db.commit()

        # Send the email (logs to console if SMTP not configured)
        send_password_reset_email(db, user.email, token)

    return MessageResponse(message="If the email exists, a reset link has been sent")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: PasswordReset, db: Session = Depends(get_db)):
    """Reset password using token."""
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == data.token,
        PasswordResetToken.used == False,
    ).first()

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    token_expiry = reset_token.expires_at
    if token_expiry.tzinfo is None:
        token_expiry = token_expiry.replace(tzinfo=timezone.utc)
    if now > token_expiry:
        reset_token.used = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset link has expired. Please request a new one.",
        )

    # Find the user
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset link",
        )

    # Update password and mark token as used
    user.password_hash = get_password_hash(data.new_password)
    reset_token.used = True
    db.commit()

    return MessageResponse(message="Password has been reset successfully")


def _is_allowed_admin_access(request: Request) -> bool:
    """Check if the request is allowed to create admin accounts.

    Allows localhost (127.0.0.1, ::1) plus any IPs listed in
    ALLOWED_ADMIN_IPS in the .env file.
    Uses get_client_ip() to get the real client IP behind a reverse proxy.
    """
    allowed = {"127.0.0.1", "::1", "localhost"}
    allowed.update(settings.ALLOWED_ADMIN_IPS)

    client_ip = get_client_ip(request)
    return client_ip in allowed if client_ip else False


@router.post("/create-admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_admin(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    """Create a new admin account. Only accessible from allowed IPs."""
    if not _is_allowed_admin_access(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin creation is only available from localhost",
        )

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create admin user - skip email verification
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        role=UserRole.ADMIN,
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.get("/localhost-check")
def check_localhost(request: Request):
    """Check if the current request is from an allowed IP."""
    return {"is_localhost": _is_allowed_admin_access(request), "client_host": get_client_ip(request)}


@router.delete("/me", response_model=MessageResponse)
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete current user's account."""
    db.delete(current_user)
    db.commit()

    return MessageResponse(message="Account deleted successfully")
