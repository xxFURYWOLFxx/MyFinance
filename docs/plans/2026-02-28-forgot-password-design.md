# Forgot Password Feature Design

Date: 2026-02-28

## Summary

Implement a working forgot password flow: user enters email, receives a reset link via SMTP, clicks it, sets a new password. Includes email logging for audit.

## What Already Exists

- `PasswordResetToken` model (token, expiry, used flag) -- defined but unused
- `PasswordResetRequest` / `PasswordReset` Pydantic schemas
- Frontend `ForgotPasswordForm` component at `/forgot-password`
- Frontend `authService.forgotPassword()` and `authService.resetPassword()` stubs
- Backend stubs: `/auth/forgot-password` (returns generic message), `/auth/reset-password` (returns 501)

## Changes

### Backend

1. **SMTP config** -- add to `Settings` in `core/config.py` and `.env.example`:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
   - `SMTP_FROM_EMAIL`, `SMTP_USE_TLS` (default true)
   - `FRONTEND_URL` (default `http://localhost:5173`)

2. **EmailLog model** -- new model in `models/email_log.py`:
   - id, recipient, subject, status (sent/failed), error_message, created_at
   - Registered in `models/__init__.py`

3. **Email service** (`services/email.py`):
   - `send_email(to, subject, html_body)` using Python `smtplib`
   - Logs every attempt to `EmailLog` table
   - If SMTP not configured, logs to console instead of crashing
   - `send_password_reset_email(email, token)` helper that builds the HTML and calls send_email

4. **`/auth/forgot-password` endpoint** -- replace stub:
   - Look up user by email
   - Generate `secrets.token_urlsafe(32)` token
   - Store in `PasswordResetToken` with 30-min expiry
   - Send email with link `{FRONTEND_URL}/reset-password?token=xxx`
   - Return generic success regardless (prevent enumeration)

5. **`/auth/reset-password` endpoint** -- replace stub:
   - Validate token exists, not used, not expired
   - Hash new password, update user's `password_hash`
   - Mark token as `used = True`
   - Return success message

### Frontend

6. **`ResetPasswordPage.tsx`** -- new page:
   - Reads `token` from URL query params
   - Form: new password + confirm password
   - Validates passwords match and 8+ chars
   - Calls `authService.resetPassword(token, password)`
   - On success: shows confirmation, links to login
   - On error: shows message (expired/invalid token)

7. **Route** -- add `/reset-password` as public route in `routes/index.tsx`

### Config Files

8. Update `backend/.env.example` with SMTP variables
9. Update `frontend/.env.example` with note about FRONTEND_URL

## Security

- Tokens: `secrets.token_urlsafe(32)` (cryptographically random)
- 30-minute expiry, single-use (marked used after reset)
- Generic response on forgot-password (no email enumeration)
- Falls back gracefully if SMTP not configured

## Not Included

- Rate limiting (can add later)
- Password complexity beyond 8-char minimum
- Admin UI for email settings (SMTP is .env only)
