import os
import asyncio
import uuid
import time
from typing import Dict, Optional
import logging
from twilio.rest import Client as TwilioClient
from twilio.base.exceptions import TwilioException

logger = logging.getLogger(__name__)


class CallManager:
    """Manages phone calls using Twilio API or simulated logic"""
    
    def __init__(self):
        self.use_twilio = False
        self.twilio_client = None
        
        # Check if Twilio credentials are available
        twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.twilio_from_number = os.getenv("TWILIO_FROM_NUMBER")
        
        if twilio_account_sid and twilio_auth_token:
            try:
                self.twilio_client = TwilioClient(twilio_account_sid, twilio_auth_token)
                self.use_twilio = True
                logger.info("Twilio client initialized - using real API")
            except Exception as e:
                logger.warning(f"Failed to initialize Twilio client: {e}. Using simulated mode.")
                self.use_twilio = False
        else:
            logger.info("Twilio credentials not found - using simulated mode")
    
    async def make_call(self, phone_number: str, timeout: int = 30) -> Dict:
        """
        Make a call to the given phone number.
        Returns call result with status, duration, and call_id.
        """
        call_id = str(uuid.uuid4())
        start_time = time.time()
        
        try:
            if self.use_twilio and self.twilio_client:
                result = await self._make_twilio_call(phone_number, call_id)
            else:
                result = await self._make_simulated_call(phone_number, call_id)
            
            duration = time.time() - start_time
            result['duration'] = duration
            result['call_id'] = call_id
            result['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
            
            return result
            
        except Exception as e:
            logger.error(f"Error making call to {phone_number}: {e}")
            duration = time.time() - start_time
            return {
                'call_id': call_id,
                'phone_number': phone_number,
                'status': 'failed',
                'message': f'Call failed: {str(e)}',
                'duration': duration,
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                'error_message': str(e)
            }
    
    async def _make_twilio_call(self, phone_number: str, call_id: str) -> Dict:
        """Make a call using Twilio API"""
        try:
            # Run Twilio call in executor to avoid blocking
            loop = asyncio.get_event_loop()
            
            def _call():
                call = self.twilio_client.calls.create(
                    to=phone_number,
                    from_=self.twilio_from_number,
                    url='http://demo.twilio.com/docs/voice.xml'  # Default TwiML
                )
                return call
            
            call = await loop.run_in_executor(None, _call)
            
            # Wait a bit and check status
            await asyncio.sleep(2)
            
            call_status = call.status
            if call_status in ['queued', 'ringing', 'in-progress']:
                status = 'queued'
                message = f'Call {call.sid} is {call_status}'
            elif call_status == 'completed':
                status = 'answered'
                message = f'Call {call.sid} completed successfully'
            else:
                status = 'failed'
                message = f'Call {call.sid} status: {call_status}'
            
            return {
                'phone_number': phone_number,
                'status': status,
                'message': message,
                'twilio_sid': call.sid
            }
            
        except TwilioException as e:
            logger.error(f"Twilio error: {e}")
            return {
                'phone_number': phone_number,
                'status': 'failed',
                'message': f'Twilio error: {str(e)}',
                'error_message': str(e)
            }
    
    async def _make_simulated_call(self, phone_number: str, call_id: str) -> Dict:
        """Simulate a call with realistic behavior"""
        import random
        
        # Simulate call processing time
        await asyncio.sleep(random.uniform(1, 3))
        
        # Simulate different outcomes
        rand = random.random()
        
        if rand < 0.6:  # 60% chance of answered
            duration = random.uniform(5, 60)
            await asyncio.sleep(0.5)  # Simulate call duration
            return {
                'phone_number': phone_number,
                'status': 'answered',
                'message': f'Call answered and completed successfully',
                'simulated_duration': duration
            }
        elif rand < 0.8:  # 20% chance of queued/busy
            return {
                'phone_number': phone_number,
                'status': 'queued',
                'message': 'Call is queued - line busy or ringing'
            }
        else:  # 20% chance of failed
            failure_reasons = [
                'No answer',
                'Line busy',
                'Invalid number',
                'Network error'
            ]
            reason = random.choice(failure_reasons)
            return {
                'phone_number': phone_number,
                'status': 'failed',
                'message': f'Call failed: {reason}',
                'error_message': reason
            }

