from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import logging
import traceback
from dotenv import load_dotenv
from phone_manager import PhoneManager
from call_manager import CallManager
from call_logger import CallLogger
from ai_command_processor import AICommandProcessor

load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Autodialer API")

# Initialize managers
phone_manager = PhoneManager()
call_manager = CallManager()
call_logger = CallLogger()
# AI processor will be created per request with dynamic API key


class PhoneNumberRequest(BaseModel):
    phone_numbers: List[str]


class CallCommandRequest(BaseModel):
    command: str
    gemini_api_key: Optional[str] = None  # BYOS - Bring Your Own Service


class CallResponse(BaseModel):
    call_id: str
    phone_number: str
    status: str
    message: str


class CallLogResponse(BaseModel):
    call_id: str
    phone_number: str
    status: str
    duration: Optional[float]
    timestamp: str
    error_message: Optional[str] = None


@app.post("/upload-numbers", response_model=Dict)
async def upload_phone_numbers(request: PhoneNumberRequest):
    """
    Upload a list of phone numbers to be called.
    """
    try:
        logger.info(f"Uploading {len(request.phone_numbers)} phone numbers")
        result = phone_manager.add_phone_numbers(request.phone_numbers)
        logger.info(f"Successfully uploaded {result['added']} phone numbers")
        return result
    except Exception as e:
        logger.error(f"Error uploading numbers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload-numbers-file")
async def upload_phone_numbers_file(file: UploadFile = File(...)):
    """
    Upload phone numbers from a CSV/TXT file.
    Expected format: one phone number per line.
    """
    try:
        content = await file.read()
        lines = content.decode('utf-8').strip().split('\n')
        phone_numbers = [line.strip() for line in lines if line.strip()]
        
        logger.info(f"Uploading {len(phone_numbers)} phone numbers from file")
        result = phone_manager.add_phone_numbers(phone_numbers)
        return result
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/call-all", response_model=List[CallResponse])
async def call_all_numbers():
    """
    Call all uploaded phone numbers.
    """
    try:
        phone_numbers = phone_manager.get_all_phone_numbers()
        if not phone_numbers:
            raise HTTPException(status_code=400, detail="No phone numbers uploaded")
        
        logger.info(f"Calling {len(phone_numbers)} numbers")
        results = []
        
        for phone_number in phone_numbers:
            call_result = await call_manager.make_call(phone_number)
            call_logger.log_call(call_result)
            results.append(CallResponse(
                call_id=call_result['call_id'],
                phone_number=phone_number,
                status=call_result['status'],
                message=call_result['message']
            ))
        
        return results
    except Exception as e:
        logger.error(f"Error calling all numbers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/call-number/{phone_number}", response_model=CallResponse)
async def call_single_number(phone_number: str):
    """
    Call a specific phone number.
    """
    try:
        logger.info(f"Calling number: {phone_number}")
        call_result = await call_manager.make_call(phone_number)
        call_logger.log_call(call_result)
        
        return CallResponse(
            call_id=call_result['call_id'],
            phone_number=phone_number,
            status=call_result['status'],
            message=call_result['message']
        )
    except Exception as e:
        logger.error(f"Error calling number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai-command", response_model=Dict)
async def process_ai_command(request: CallCommandRequest):
    """
    Process natural language commands using AI.
    Examples:
    - "Call all uploaded numbers"
    - "Call the number 987655392"
    - "Call numbers 1234567890 and 0987654321"
    """
    try:
        logger.info(f"Processing AI command: {request.command}")
        # Create AI processor with dynamic API key
        api_key = request.gemini_api_key or os.getenv("GEMINI_API_KEY")
        ai_processor = AICommandProcessor(call_manager, phone_manager, call_logger, api_key=api_key)
        result = await ai_processor.process_command(request.command)
        return result
    except Exception as e:
        logger.error(f"Error processing AI command: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/call-logs", response_model=List[CallLogResponse])
async def get_call_logs(limit: int = 100):
    """
    Get call logs with status, duration, and timestamp.
    """
    try:
        logs = call_logger.get_logs(limit=limit)
        return [CallLogResponse(**log) for log in logs]
    except Exception as e:
        logger.error(f"Error getting logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/phone-numbers", response_model=Dict)
async def get_phone_numbers():
    """
    Get all uploaded phone numbers.
    """
    try:
        numbers = phone_manager.get_all_phone_numbers()
        return {
            "total": len(numbers),
            "phone_numbers": numbers
        }
    except Exception as e:
        logger.error(f"Error getting phone numbers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/phone-numbers/{phone_number}", response_model=Dict)
async def delete_phone_number(phone_number: str):
    """
    Delete a specific phone number from the list.
    """
    try:
        result = phone_manager.remove_phone_number(phone_number)
        return result
    except Exception as e:
        logger.error(f"Error deleting phone number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {
        "message": "Autodialer API",
        "endpoints": {
            "upload_numbers": "POST /upload-numbers",
            "upload_file": "POST /upload-numbers-file",
            "call_all": "POST /call-all",
            "call_number": "POST /call-number/{phone_number}",
            "ai_command": "POST /ai-command",
            "call_logs": "GET /call-logs",
            "phone_numbers": "GET /phone-numbers",
            "delete_number": "DELETE /phone-numbers/{phone_number}"
        }
    }

