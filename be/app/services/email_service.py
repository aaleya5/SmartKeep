import logging
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    async def send_verification_email(self, email: str, token: str):
        link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        subject = "Verify your SmartKeep account"
        content = f"Please verify your account by clicking this link: {link}"
        
        logger.info(f"Sending verification email to {email}: {link}")
        
        if settings.RESEND_API_KEY:
            await self._send_via_resend(email, subject, content)

    async def send_password_reset_email(self, email: str, token: str):
        link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        subject = "Reset your SmartKeep password"
        content = f"You requested a password reset. Click here to reset: {link}\n\nThis link expires in 1 hour."
        
        logger.info(f"Sending password reset email to {email}: {link}")
        
        if settings.RESEND_API_KEY:
            await self._send_via_resend(email, subject, content)

    async def _send_via_resend(self, email: str, subject: str, content: str):
        if not settings.RESEND_API_KEY:
            return
            
        # Implementation for Resend API
        # https://resend.com/docs/api-reference/emails/send-email
        url = "https://api.resend.com/emails"
        api_key = settings.RESEND_API_KEY.get_secret_value()
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "from": settings.EMAIL_FROM,
            "to": email,
            "subject": subject,
            "text": content
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data)
                response.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {e}")

email_service = EmailService()
