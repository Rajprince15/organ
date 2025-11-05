"""
SMS Service for Organ Donation Platform
Supports both mock (console logging) and real SMS (Twilio) modes
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SMSService:
    """SMS service with mock and Twilio support"""
    
    def __init__(self):
        # Check if SMS is enabled (future use)
        self.enable_sms = os.environ.get('ENABLE_SMS', 'false').lower() == 'true'
        self.twilio_enabled = False
        
        if self.enable_sms:
            try:
                # Try importing Twilio
                from twilio.rest import Client
                
                self.account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
                self.auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
                self.from_phone = os.environ.get('TWILIO_PHONE_NUMBER')
                
                if self.account_sid and self.auth_token and self.from_phone:
                    self.client = Client(self.account_sid, self.auth_token)
                    self.twilio_enabled = True
                    logger.info("📱 SMS service initialized with Twilio")
                else:
                    logger.warning("⚠️  Twilio credentials missing, using mock SMS service")
            except ImportError:
                logger.warning("⚠️  Twilio library not available, using mock SMS service")
        else:
            logger.info("📱 SMS service initialized in MOCK mode (console logging)")
    
    async def send_donor_checkup_sms(
        self,
        donor_name: str,
        to_phone: str,
        branch_hospital_name: str,
        branch_address: str,
        branch_phone: str
    ) -> bool:
        """
        Send SMS to donor about their assigned branch hospital for checkup.
        
        Args:
            donor_name: Name of the donor
            to_phone: Phone number to send SMS to
            branch_hospital_name: Name of assigned branch hospital
            branch_address: Address of branch hospital
            branch_phone: Phone number of branch hospital
            
        Returns:
            bool: True if SMS was sent successfully (or logged in mock mode)
        """
        
        # SMS body (must be concise)
        sms_body = f"""Hello {donor_name},

Thank you for registering as an organ donor! You've been assigned to:

{branch_hospital_name}
📍 {branch_address}
📞 {branch_phone}

Please contact them to schedule your eligibility checkup.

Organ Connect Team"""
        
        if self.twilio_enabled:
            # Send real SMS via Twilio
            return await self._send_twilio_sms(to_phone, sms_body)
        else:
            # Mock mode - log to console
            return self._send_mock_sms(to_phone, sms_body)
    
    async def _send_twilio_sms(self, to_phone: str, body: str) -> bool:
        """Send SMS via Twilio"""
        try:
            message = self.client.messages.create(
                body=body,
                from_=self.from_phone,
                to=to_phone
            )
            
            logger.info(f"✅ SMS sent successfully to {to_phone} (SID: {message.sid})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send SMS to {to_phone}: {str(e)}")
            return False
    
    def _send_mock_sms(self, to_phone: str, body: str) -> bool:
        """Mock SMS - log to console"""
        logger.info(f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📱 MOCK SMS SENT                                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ To:      {to_phone:<68} ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Message:                                                                     ║
╠══════════════════════════════════════════════════════════════════════════════╣
{body}
╚══════════════════════════════════════════════════════════════════════════════╝
        """)
        
        # In mock mode, always return True
        return True


# Singleton instance
sms_service = SMSService()
