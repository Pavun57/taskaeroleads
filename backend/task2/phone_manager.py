import os
import json
from typing import List, Set
import logging

logger = logging.getLogger(__name__)


class PhoneManager:
    """Manages phone number storage and retrieval"""
    
    def __init__(self, storage_file: str = "phone_numbers.json"):
        self.storage_file = storage_file
        self.phone_numbers: Set[str] = set()
        self._load_numbers()
    
    def _normalize_phone_number(self, phone: str) -> str:
        """Normalize phone number format"""
        # Remove all non-digit characters except +
        normalized = ''.join(c for c in phone if c.isdigit() or c == '+')
        return normalized
    
    def _validate_phone_number(self, phone: str) -> bool:
        """Validate phone number format"""
        normalized = self._normalize_phone_number(phone)
        # Basic validation: should have at least 10 digits
        digits_only = ''.join(c for c in normalized if c.isdigit())
        return len(digits_only) >= 10
    
    def _load_numbers(self):
        """Load phone numbers from storage file"""
        try:
            if os.path.exists(self.storage_file):
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    self.phone_numbers = set(data.get('phone_numbers', []))
                logger.info(f"Loaded {len(self.phone_numbers)} phone numbers from storage")
        except Exception as e:
            logger.error(f"Error loading phone numbers: {e}")
            self.phone_numbers = set()
    
    def _save_numbers(self):
        """Save phone numbers to storage file"""
        try:
            with open(self.storage_file, 'w') as f:
                json.dump({'phone_numbers': list(self.phone_numbers)}, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving phone numbers: {e}")
    
    def add_phone_numbers(self, phone_numbers: List[str]) -> dict:
        """Add phone numbers to the list"""
        added = []
        invalid = []
        duplicates = []
        
        for phone in phone_numbers:
            normalized = self._normalize_phone_number(phone)
            
            if not self._validate_phone_number(normalized):
                invalid.append(phone)
                continue
            
            if normalized in self.phone_numbers:
                duplicates.append(phone)
                continue
            
            self.phone_numbers.add(normalized)
            added.append(normalized)
        
        self._save_numbers()
        
        return {
            "added": len(added),
            "invalid": len(invalid),
            "duplicates": len(duplicates),
            "total": len(self.phone_numbers),
            "invalid_numbers": invalid,
            "duplicate_numbers": duplicates
        }
    
    def get_all_phone_numbers(self) -> List[str]:
        """Get all stored phone numbers"""
        return list(self.phone_numbers)
    
    def remove_phone_number(self, phone_number: str) -> dict:
        """Remove a phone number from the list"""
        normalized = self._normalize_phone_number(phone_number)
        
        if normalized in self.phone_numbers:
            self.phone_numbers.remove(normalized)
            self._save_numbers()
            return {
                "success": True,
                "message": f"Phone number {phone_number} removed",
                "remaining": len(self.phone_numbers)
            }
        else:
            return {
                "success": False,
                "message": f"Phone number {phone_number} not found",
                "remaining": len(self.phone_numbers)
            }
    
    def clear_all_numbers(self):
        """Clear all phone numbers"""
        self.phone_numbers.clear()
        self._save_numbers()

