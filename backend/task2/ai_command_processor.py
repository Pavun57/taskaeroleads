import os
import asyncio
import google.generativeai as genai
import re
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class AICommandProcessor:
    """Processes natural language commands using Gemini AI"""
    
    def __init__(self, call_manager, phone_manager, call_logger, api_key: Optional[str] = None):
        self.call_manager = call_manager
        self.phone_manager = phone_manager
        self.call_logger = call_logger
        
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set or not provided")
        
        genai.configure(api_key=self.api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.model = genai.GenerativeModel(model_name)
    
    async def process_command(self, command: str) -> Dict:
        """
        Process a natural language command and execute the appropriate action.
        
        Examples:
        - "Call all uploaded numbers"
        - "Call the number 987655392"
        - "Call numbers 1234567890 and 0987654321"
        """
        try:
            # Use AI to understand the command
            intent = await self._parse_command(command)
            
            logger.info(f"Parsed command intent: {intent}")
            
            # Execute based on intent
            if intent['action'] == 'call_all':
                return await self._execute_call_all()
            elif intent['action'] == 'call_numbers':
                return await self._execute_call_numbers(intent['phone_numbers'])
            else:
                return {
                    'success': False,
                    'message': f"Unknown action: {intent['action']}",
                    'intent': intent
                }
                
        except Exception as e:
            logger.error(f"Error processing command: {e}")
            return {
                'success': False,
                'message': f'Error processing command: {str(e)}'
            }
    
    async def _parse_command(self, command: str) -> Dict:
        """Use Gemini to parse the command and extract intent"""
        
        prompt = f"""
        Analyze the following command and extract the intent.
        
        Commands can be:
        1. "Call all uploaded numbers" or "Call all numbers" → action: call_all
        2. "Call the number 987655392" or "Call 987655392" → action: call_numbers, phone_numbers: ["987655392"]
        3. "Call numbers 1234567890 and 0987654321" → action: call_numbers, phone_numbers: ["1234567890", "0987654321"]
        
        Return ONLY a JSON object with this structure:
        {{
            "action": "call_all" or "call_numbers",
            "phone_numbers": [] (only if action is call_numbers)
        }}
        
        Command: "{command}"
        
        JSON:
        """
        
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(prompt)
            )
            
            # Parse JSON from response
            response_text = response.text.strip()
            
            # Try to extract JSON from response
            json_match = re.search(r'\{[^}]+\}', response_text, re.DOTALL)
            if json_match:
                import json
                intent = json.loads(json_match.group())
            else:
                # Fallback: try to parse the entire response
                import json
                intent = json.loads(response_text)
            
            # Validate intent
            if 'action' not in intent:
                raise ValueError("Intent missing 'action' field")
            
            # Extract phone numbers from command if not in intent
            if intent['action'] == 'call_numbers' and 'phone_numbers' not in intent:
                phone_numbers = self._extract_phone_numbers(command)
                intent['phone_numbers'] = phone_numbers
            
            return intent
            
        except Exception as e:
            logger.error(f"Error parsing command with AI: {e}")
            # Fallback to simple pattern matching
            return self._fallback_parse(command)
    
    def _extract_phone_numbers(self, text: str) -> List[str]:
        """Extract phone numbers from text using regex"""
        # Pattern to match phone numbers
        phone_pattern = r'[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}'
        matches = re.findall(phone_pattern, text)
        
        # Clean and normalize
        phone_numbers = []
        for match in matches:
            normalized = ''.join(c for c in match if c.isdigit() or c == '+')
            if len(normalized.replace('+', '')) >= 10:
                phone_numbers.append(normalized)
        
        return phone_numbers
    
    def _fallback_parse(self, command: str) -> Dict:
        """Fallback parsing using simple pattern matching"""
        command_lower = command.lower()
        
        if 'all' in command_lower and 'call' in command_lower:
            return {'action': 'call_all'}
        
        # Extract phone numbers
        phone_numbers = self._extract_phone_numbers(command)
        if phone_numbers:
            return {'action': 'call_numbers', 'phone_numbers': phone_numbers}
        
        # Default to call_all if uncertain
        return {'action': 'call_all'}
    
    async def _execute_call_all(self) -> Dict:
        """Execute calling all uploaded numbers"""
        phone_numbers = self.phone_manager.get_all_phone_numbers()
        
        if not phone_numbers:
            return {
                'success': False,
                'message': 'No phone numbers uploaded',
                'calls_made': 0
            }
        
        results = []
        for phone_number in phone_numbers:
            call_result = await self.call_manager.make_call(phone_number)
            self.call_logger.log_call(call_result)  # Log the call
            results.append(call_result)
        
        return {
            'success': True,
            'message': f'Called {len(phone_numbers)} numbers',
            'calls_made': len(phone_numbers),
            'results': results
        }
    
    async def _execute_call_numbers(self, phone_numbers: List[str]) -> Dict:
        """Execute calling specific phone numbers"""
        if not phone_numbers:
            return {
                'success': False,
                'message': 'No phone numbers provided',
                'calls_made': 0
            }
        
        results = []
        for phone_number in phone_numbers:
            call_result = await self.call_manager.make_call(phone_number)
            self.call_logger.log_call(call_result)  # Log the call
            results.append(call_result)
        
        return {
            'success': True,
            'message': f'Called {len(phone_numbers)} number(s)',
            'calls_made': len(phone_numbers),
            'results': results
        }

