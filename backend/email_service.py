"""
Email Service for Organ Donation Platform
Supports both mock (console logging) and real email (SendGrid) modes
"""
import os
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class EmailService:
    """Email service with mock and SendGrid support"""
    
    def __init__(self):
        # Check if we should use real email or mock
        self.use_real_email = os.environ.get('USE_REAL_EMAIL', 'false').lower() == 'true'
        self.sendgrid_enabled = False
        self.from_email = os.environ.get('FROM_EMAIL', 'noreply@organconnect.com')
        
        if self.use_real_email:
            try:
                # Try importing SendGrid
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail
                
                self.sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
                
                if self.sendgrid_api_key:
                    self.sg_client = SendGridAPIClient(self.sendgrid_api_key)
                    self.sendgrid_enabled = True
                    logger.info("✉️  Email service initialized with SendGrid")
                else:
                    logger.warning("⚠️  SendGrid API key missing, using mock email service")
            except ImportError:
                logger.warning("⚠️  SendGrid library not available, using mock email service")
            except Exception as e:
                logger.warning(f"⚠️  SendGrid initialization failed: {str(e)}, using mock email service")
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
        
        if self.sendgrid_enabled:
            # Send real email via SendGrid
            return await self._send_sendgrid_email(to_email, subject, email_body)
        else:
            # Mock mode - log to console
            return self._send_mock_email(to_email, subject, email_body)
    
    async def _send_sendgrid_email(self, to_email: str, subject: str, body: str) -> bool:
        """Send email via SendGrid"""
        try:
            from sendgrid.helpers.mail import Mail, Email, To, Content
            
            # Create message
            from_email = Email(self.from_email)
            to_email_obj = To(to_email)
            content = Content("text/plain", body)
            mail = Mail(from_email, to_email_obj, subject, content)
            
            # Send email
            response = self.sg_client.send(mail)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"✅ Email sent successfully to {to_email} (Status: {response.status_code})")
                return True
            else:
                logger.error(f"❌ Failed to send email to {to_email} (Status: {response.status_code})")
                return False
            
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
        
        if self.sendgrid_enabled:
            return await self._send_sendgrid_email(to_email, subject, email_body)
        else:
            return self._send_mock_email(to_email, subject, email_body)
    
    async def send_donor_checkup_notification(
        self,
        donor_name: str,
        to_email: str,
        branch_hospital_name: str,
        branch_address: str,
        branch_city: str,
        branch_state: str,
        branch_phone: str,
        branch_email: str
    ) -> bool:
        """
        Send donor notification about assigned branch hospital for eligibility checkup.
        
        Args:
            donor_name: Name of the donor
            to_email: Donor's email address
            branch_hospital_name: Name of assigned branch hospital
            branch_address: Address of branch hospital
            branch_city: City of branch hospital
            branch_state: State of branch hospital
            branch_phone: Phone number of branch hospital
            branch_email: Email of branch hospital
            
        Returns:
            bool: True if email was sent successfully (or logged in mock mode)
        """
        
        subject = f"Welcome to Organ Connect - Eligibility Checkup Required"
        
        # Email body
        email_body = f"""
Dear {donor_name},

Thank you for registering as an organ donor! Your compassion and generosity can save lives.

🏥 YOU'VE BEEN ASSIGNED TO A BRANCH HOSPITAL

To complete your registration, you need to undergo an eligibility checkup at the branch hospital assigned to you:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hospital Name: {branch_hospital_name}
Address:       {branch_address}
               {branch_city}, {branch_state}
Phone:         {branch_phone}
Email:         {branch_email}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 NEXT STEPS:

1. Contact the branch hospital to schedule your eligibility checkup
   - Call them at: {branch_phone}
   - Or email them at: {branch_email}

2. During the checkup, the medical team will:
   - Review your medical history
   - Conduct necessary tests
   - Assess your eligibility for organ donation

3. After the checkup, the hospital will upload your eligibility report to our system

4. Once approved, you'll be added to the active donor database

⏰ IMPORTANT:
- Please schedule your checkup within the next 7 days
- Bring a valid government-issued ID
- Bring any relevant medical records
- The checkup is completely FREE of charge

❓ Questions or Need Help?
- Visit our Help Center: {os.environ.get('FRONTEND_URL', 'https://organconnect.com')}/support
- Email: support@organconnect.com
- Call: 1-800-ORGAN-DONATE

Thank you for your commitment to saving lives through organ donation!

Best regards,
The Organ Connect Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated email. Please do not reply to this message.
For support, please use the contact methods mentioned above.
        """
        
        if self.sendgrid_enabled:
            return await self._send_sendgrid_email(to_email, subject, email_body)
        else:
            return self._send_mock_email(to_email, subject, email_body)
    async def send_donor_eligibility_notification(
        self,
        donor_name: str,
        to_email: str,
        eligibility_status: str,
        branch_hospital_name: str,
        report_url: Optional[str] = None
    ) -> bool:
        """
        Send donor notification about eligibility determination.
        
        Args:
            donor_name: Name of the donor
            to_email: Donor's email address
            eligibility_status: "eligible" or "not_eligible"
            branch_hospital_name: Name of branch hospital that assessed
            report_url: Optional URL to the eligibility report
            
        Returns:
            bool: True if email was sent successfully (or logged in mock mode)
        """
        
        if eligibility_status == "eligible":
            subject = "Congratulations! You're Eligible for Organ Donation"
            
            email_body = f"""
Dear {donor_name},

🎉 GREAT NEWS! You've been approved as an eligible organ donor!

Your eligibility checkup has been completed by {branch_hospital_name}, and you have been cleared for organ donation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ELIGIBILITY STATUS: APPROVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 WHAT'S NEXT:

1. Your profile is now ACTIVE in our donor database
2. Hospitals searching for compatible donors can now see your profile
3. You'll be notified if you're a match for someone in need
4. Keep your contact information updated in your dashboard

🌟 YOUR IMPACT:

By becoming an organ donor, you have the potential to:
- Save up to 8 lives through organ donation
- Enhance the lives of up to 75 people through tissue donation
- Bring hope to families waiting for life-saving transplants

📱 STAY CONNECTED:

- Log in to your dashboard to view your profile
- Update your information if anything changes
- Share your donor story to inspire others

Thank you for your incredible generosity and commitment to saving lives!

Best regards,
The Organ Connect Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated email. Please do not reply to this message.
For questions, visit: {os.environ.get('FRONTEND_URL', 'https://organconnect.com')}/support
            """
        else:  # not_eligible
            subject = "Organ Donation Eligibility Update"
            
            email_body = f"""
Dear {donor_name},

Thank you for your interest in becoming an organ donor and for completing your eligibility checkup at {branch_hospital_name}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ELIGIBILITY STATUS UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After reviewing your medical assessment, we regret to inform you that you are currently not eligible for organ donation at this time.

This decision is based on medical criteria designed to ensure the safety of both donors and recipients.

📋 WHAT THIS MEANS:

- Your application status has been updated in our system
- This determination is based on current medical guidelines
- Eligibility criteria may change over time

💡 IMPORTANT INFORMATION:

- Medical eligibility can change based on health status changes
- You may reapply in the future if your health situation changes
- There are other ways to support organ donation:
  * Volunteer with organ donation awareness programs
  * Share information about organ donation with others
  * Support organ donation advocacy initiatives

❓ HAVE QUESTIONS?

If you have questions about your eligibility determination:
- Contact {branch_hospital_name} for medical details
- Visit our FAQ section: {os.environ.get('FRONTEND_URL', 'https://organconnect.com')}/support
- Email our support team: support@organconnect.com

We appreciate your willingness to help save lives, and we thank you for your time and consideration.

Best regards,
The Organ Connect Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated email. Please do not reply to this message.
For questions, visit: {os.environ.get('FRONTEND_URL', 'https://organconnect.com')}/support
            """
        
        if self.sendgrid_enabled:
            return await self._send_sendgrid_email(to_email, subject, email_body)
        else:
            return self._send_mock_email(to_email, subject, email_body)


# Singleton instance
email_service = EmailService()
