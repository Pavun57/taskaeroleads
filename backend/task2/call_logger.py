import json
import os
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class CallLogger:
    """Manages call logging and retrieval"""
    
    def __init__(self, log_file: str = "call_logs.json"):
        self.log_file = log_file
        self.logs: List[Dict] = []
        self._load_logs()
    
    def _load_logs(self):
        """Load existing logs from file"""
        try:
            if os.path.exists(self.log_file):
                with open(self.log_file, 'r') as f:
                    self.logs = json.load(f)
                logger.info(f"Loaded {len(self.logs)} call logs")
        except Exception as e:
            logger.error(f"Error loading logs: {e}")
            self.logs = []
    
    def _save_logs(self):
        """Save logs to file"""
        try:
            with open(self.log_file, 'w') as f:
                json.dump(self.logs, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving logs: {e}")
    
    def log_call(self, call_result: Dict):
        """Log a call result"""
        log_entry = {
            'call_id': call_result.get('call_id', 'unknown'),
            'phone_number': call_result.get('phone_number', 'unknown'),
            'status': call_result.get('status', 'unknown'),
            'duration': call_result.get('duration', 0.0),
            'timestamp': call_result.get('timestamp', datetime.now().isoformat()),
            'message': call_result.get('message', ''),
            'error_message': call_result.get('error_message'),
            'twilio_sid': call_result.get('twilio_sid'),
        }
        
        self.logs.append(log_entry)
        self._save_logs()
        
        logger.info(f"Logged call: {log_entry['phone_number']} - {log_entry['status']}")
    
    def get_logs(self, limit: int = 100, status: Optional[str] = None) -> List[Dict]:
        """Get call logs with optional filtering"""
        logs = self.logs.copy()
        
        # Filter by status if provided
        if status:
            logs = [log for log in logs if log.get('status') == status]
        
        # Sort by timestamp (newest first)
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Limit results
        return logs[:limit]
    
    def get_statistics(self) -> Dict:
        """Get call statistics"""
        total = len(self.logs)
        if total == 0:
            return {
                'total_calls': 0,
                'answered': 0,
                'failed': 0,
                'queued': 0,
                'success_rate': 0.0
            }
        
        answered = sum(1 for log in self.logs if log.get('status') == 'answered')
        failed = sum(1 for log in self.logs if log.get('status') == 'failed')
        queued = sum(1 for log in self.logs if log.get('status') == 'queued')
        
        return {
            'total_calls': total,
            'answered': answered,
            'failed': failed,
            'queued': queued,
            'success_rate': round((answered / total) * 100, 2) if total > 0 else 0.0
        }
    
    def clear_logs(self):
        """Clear all logs"""
        self.logs = []
        self._save_logs()

