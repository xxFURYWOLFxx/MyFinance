import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.email_log import EmailLog

logger = logging.getLogger(__name__)


def _is_smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def _base_email_template(content_html: str) -> str:
    """Shared dark-themed email template that wraps any content block."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{settings.APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f0f1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px; width: 100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #a855f7, #3b82f6); padding: 12px 14px; border-radius: 14px;">
                <span style="font-size: 22px; color: #ffffff;">&#10024;</span>
              </div>
              <div style="margin-top: 10px;">
                <span style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">{settings.APP_NAME}</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color: #1a1a2e; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.06); padding: 36px 32px;">
              {content_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                &copy; {settings.APP_NAME} &mdash; Your financial command center.
              </p>
              <p style="margin: 6px 0 0; font-size: 11px; color: #475569;">
                You received this email because an action was performed on your account.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_email(db: Session, to: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Logs to EmailLog table and falls back to console if SMTP not configured."""

    if not _is_smtp_configured():
        logger.warning(
            f"SMTP not configured. Email would have been sent to {to}:\n"
            f"Subject: {subject}\n"
        )
        print(f"\n{'='*60}")
        print(f"EMAIL (SMTP not configured - printing to console)")
        print(f"To: {to}")
        print(f"Subject: {subject}")
        print(f"{'='*60}")
        print(html_body)
        print(f"{'='*60}\n")

        log = EmailLog(
            recipient=to,
            subject=subject,
            status="sent",
            error_message="SMTP not configured - logged to console",
        )
        db.add(log)
        db.commit()
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = to

        msg.attach(MIMEText(html_body, "html"))

        if settings.SMTP_USE_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)

        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(msg["From"], [to], msg.as_string())
        server.quit()

        log = EmailLog(recipient=to, subject=subject, status="sent")
        db.add(log)
        db.commit()

        logger.info(f"Email sent to {to}: {subject}")
        return True

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to send email to {to}: {error_msg}")

        log = EmailLog(
            recipient=to,
            subject=subject,
            status="failed",
            error_message=error_msg,
        )
        db.add(log)
        db.commit()
        return False


def send_password_reset_email(db: Session, email: str, token: str) -> bool:
    """Send a password reset email with the reset link."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    subject = f"{settings.APP_NAME} - Password Reset"

    content = f"""
    <!-- Heading -->
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #ffffff;">
      Reset your password
    </h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      We received a request to reset the password for your {settings.APP_NAME} account.
      Click the button below to choose a new password.
    </p>

    <!-- Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 4px 0 28px;">
          <a href="{reset_url}"
             style="display: inline-block; background: linear-gradient(135deg, #a855f7, #3b82f6);
                    color: #ffffff; padding: 14px 36px; border-radius: 10px;
                    text-decoration: none; font-weight: 600; font-size: 14px;
                    letter-spacing: 0.2px;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <!-- Expiry note -->
    <div style="background-color: rgba(255, 255, 255, 0.04); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        This link expires in <strong style="color: #94a3b8;">30 minutes</strong>.
        If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>

    <!-- Fallback URL -->
    <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="{reset_url}" style="color: #a78bfa; word-break: break-all; font-size: 12px;">{reset_url}</a>
    </p>
    """

    html_body = _base_email_template(content)
    return send_email(db, email, subject, html_body)


def send_verification_email(db: Session, email: str, token: str) -> bool:
    """Send an email verification link after registration."""
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = f"{settings.APP_NAME} - Verify Your Email"

    content = f"""
    <!-- Heading -->
    <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #ffffff;">
      Verify your email address
    </h2>
    <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
      Thanks for signing up for {settings.APP_NAME}! Please confirm your email
      address by clicking the button below so we know it's really you.
    </p>

    <!-- Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 4px 0 28px;">
          <a href="{verify_url}"
             style="display: inline-block; background: linear-gradient(135deg, #a855f7, #3b82f6);
                    color: #ffffff; padding: 14px 36px; border-radius: 10px;
                    text-decoration: none; font-weight: 600; font-size: 14px;
                    letter-spacing: 0.2px;">
            Verify Email
          </a>
        </td>
      </tr>
    </table>

    <!-- Expiry note -->
    <div style="background-color: rgba(255, 255, 255, 0.04); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
        This link expires in <strong style="color: #94a3b8;">30 minutes</strong>.
        If you didn't create an account, you can ignore this email.
      </p>
    </div>

    <!-- Fallback URL -->
    <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <a href="{verify_url}" style="color: #a78bfa; word-break: break-all; font-size: 12px;">{verify_url}</a>
    </p>
    """

    html_body = _base_email_template(content)
    return send_email(db, email, subject, html_body)
