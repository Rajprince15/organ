"""
Email Service for Organ Donation Platform
Supports both mock (console logging) and real email (SMTP) modes
"""
import os
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class EmailService:
    """Email service with mock and SMTP support"""
    
    def __init__(self):
        # Check if we should use real email or mock
        self.use_real_email = os.environ.get('USE_REAL_EMAIL', 'false').lower() == 'true'
        self.smtp_enabled = False
        
        if self.use_real_email:
            try:
                # Try importing SMTP libraries
                import smtplib
                from email.mime.text import MIMEText
                from email.mime.multipart import MIMEMultipart
                
                self.smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
                self.smtp_port = int(os.environ.get('SMTP_PORT', 587))
                self.smtp_user = os.environ.get('SMTP_USER')
                self.smtp_password = os.environ.get('SMTP_PASSWORD')
                self.from_email = os.environ.get('FROM_EMAIL', 'noreply@organconnect.com')
                
                if self.smtp_user and self.smtp_password:
                    self.smtp_enabled = True
                    logger.info("✉️  Email service initialized with SMTP")
                else:
                    logger.warning("⚠️  SMTP credentials missing, using mock email service")
            except ImportError:
                logger.warning("⚠️  SMTP libraries not available, using mock email service")
        else:
            logger.info("📧  Email service initialized in MOCK mode (console logging)")
    
    async def send_branch_hospital_credentials(
        self,
        branch_hospital_name: str,
        to_email: str,
        login_email: str,
        password: str,
        license_number: str
    ) -> bool:
        """
        Send branch hospital credentials email
        
        Args:
            branch_hospital_name: Name of the branch hospital
            to_email: Email address to send to
            login_email: Login email (same as to_email)
            password: Auto-generated password
            license_number: Hospital license number
            
        Returns:
            bool: True if email was sent successfully (or logged in mock mode)
        """
        
        subject = f"Welcome to Organ Connect - Branch Hospital Credentials"
        
        # Email body
        email_body = f"""
Dear {branch_hospital_name} Team,

Welcome to the Organ Connect Platform! Your branch hospital account has been successfully created.

Your login credentials are:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:          {login_email}
Password:       {password}
License Number: {license_number}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 IMPORTANT SECURITY NOTICE:
- Please change your password after your first login
- Keep these credentials secure and confidential
- Do not share your password with unauthorized personnel
- This is the only time we will send your password via email

📋 Next Steps:
1. Visit our platform at: {os.environ.get('FRONTEND_URL', 'https://organconnect.com')}
2. Click "Login" and use the credentials above
3. Complete your branch hospital profile
4. Start accessing the donor database and posting requirements

📚 Need Help?
- Visit our Help Center
- Contact support through the platform
- Email: support@organconnect.com

Thank you for joining Organ Connect and helping save lives through organ donation.

Best regards,
The Organ Connect Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated email. Please do not reply to this message.
For support, please use the contact methods mentioned above.
        """
        
        if self.smtp_enabled:
            # Send real email via SMTP
            return await self._send_smtp_email(to_email, subject, email_body)
        else:
            # Mock mode - log to console
            return self._send_mock_email(to_email, subject, email_body)
    
    async def _send_smtp_email(self, to_email: str, subject: str, body: str) -> bool:
        """Send email via SMTP"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # Create message
            message = MIMEMultipart()
            message['From'] = self.from_email
            message['To'] = to_email
            message['Subject'] = subject
            message.attach(MIMEText(body, 'plain'))
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {str(e)}")
            return False
    
    def _send_mock_email(self, to_email: str, subject: str, body: str) -> bool:
        """Mock email - log to console"""
        logger.info(f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📧 MOCK EMAIL SENT                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ To:      {to_email:<68} ║
║ Subject: {subject:<68} ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Body:                                                                        ║
╠══════════════════════════════════════════════════════════════════════════════╣
{body}
╚══════════════════════════════════════════════════════════════════════════════╝
        """)
        
        # In mock mode, always return True
        return True
    
    async def send_password_reset_email(
        self,
        user_name: str,
        to_email: str,
        new_password: str
    ) -> bool:
        """Send password reset email"""
        subject = "Password Reset - Organ Connect"
        
        email_body = f"""
Dear {user_name},

Your password has been reset successfully.

Your new login credentials are:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:    {to_email}
Password: {new_password}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 IMPORTANT:
- Please log in and change your password immediately
- Do not share this password with anyone
- If you did not request this password reset, please contact support immediately

Best regards,
The Organ Connect Team
        """
        
        if self.smtp_enabled:
            return await self._send_smtp_email(to_email, subject, email_body)
        else:
            return self._send_mock_email(to_email, subject, email_body)


# Singleton instance
email_service = EmailService()
