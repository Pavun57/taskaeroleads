"""
API Configuration Manager - Handles dynamic API key configuration
"""
import os
from typing import Dict, Optional
from dotenv import load_dotenv, set_key, find_dotenv

load_dotenv()


class APIConfigManager:
    """Manages API keys dynamically for BYOS (Bring Your Own Service)"""
    
    def __init__(self):
        self.env_file = find_dotenv()
        if not self.env_file:
            self.env_file = ".env"
    
    def update_config(self, config: Dict[str, str]) -> Dict:
        """Update configuration with new API keys"""
        updated = {}
        
        for key, value in config.items():
            if value:  # Only update if value is provided
                # Update environment variable
                os.environ[key] = value
                
                # Update .env file
                try:
                    set_key(self.env_file, key, value)
                    updated[key] = "updated"
                except Exception as e:
                    updated[key] = f"error: {str(e)}"
        
        return {
            "success": True,
            "message": "Configuration updated",
            "updated_keys": updated
        }
    
    def get_config_status(self) -> Dict:
        """Get status of current configuration"""
        return {
            "gemini_api_key": "configured" if os.getenv("GEMINI_API_KEY") else "not_set",
            "linkedin_email": "configured" if os.getenv("LINKEDIN_EMAIL") else "not_set",
            "linkedin_password": "configured" if os.getenv("LINKEDIN_PASSWORD") else "not_set",
            "twilio_account_sid": "configured" if os.getenv("TWILIO_ACCOUNT_SID") else "not_set",
            "twilio_auth_token": "configured" if os.getenv("TWILIO_AUTH_TOKEN") else "not_set",
            "twilio_from_number": "configured" if os.getenv("TWILIO_FROM_NUMBER") else "not_set",
        }
    
    def clear_config(self, keys: list) -> Dict:
        """Clear specific configuration keys"""
        cleared = []
        for key in keys:
            if key in os.environ:
                del os.environ[key]
                try:
                    set_key(self.env_file, key, "")
                    cleared.append(key)
                except:
                    pass
        
        return {
            "success": True,
            "message": f"Cleared {len(cleared)} keys",
            "cleared_keys": cleared
        }


# Global config manager instance
config_manager = APIConfigManager()

