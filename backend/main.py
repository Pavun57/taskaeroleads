import os
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
from api_config import config_manager

load_dotenv()

# Add task directories to path
task1_path = os.path.join(os.path.dirname(__file__), 'task1')
task2_path = os.path.join(os.path.dirname(__file__), 'task2')
task3_path = os.path.join(os.path.dirname(__file__), 'task3')

sys.path.insert(0, task1_path)
sys.path.insert(0, task2_path)
sys.path.insert(0, task3_path)

# Import task apps
import importlib.util

# Load task1 app
spec1 = importlib.util.spec_from_file_location("task1_app", os.path.join(task1_path, "app.py"))
task1_module = importlib.util.module_from_spec(spec1)
spec1.loader.exec_module(task1_module)
task1_app = task1_module.app  # app is the FastAPI instance

# Load task2 app
spec2 = importlib.util.spec_from_file_location("task2_app", os.path.join(task2_path, "app.py"))
task2_module = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(task2_module)
task2_app = task2_module.app  # app is the FastAPI instance

# Load task3 app
spec3 = importlib.util.spec_from_file_location("task3_app", os.path.join(task3_path, "app.py"))
task3_module = importlib.util.module_from_spec(spec3)
spec3.loader.exec_module(task3_module)
task3_app = task3_module.app  # app is the FastAPI instance


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("\n" + "=" * 80)
    print("TaskAero Leads - Multi-Task API Server")
    print("=" * 80)
    print("\nAvailable Tasks:")
    print("  Task 1: LinkedIn Leads Scraper    → /task1")
    print("  Task 2: Autodialer              → /task2")
    print("  Task 3: AI Blog Generator        → /task3")
    print("\n" + "=" * 80)
    yield
    # Shutdown
    print("\nShutting down server...")


# Create main FastAPI app
main_app = FastAPI(
    title="TaskAero Leads - Multi-Task API",
    description="Combined API for LinkedIn Scraper, Autodialer, and Blog Generator",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
main_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Configuration endpoints (for frontend BYOS)
class APIConfigRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    linkedin_email: Optional[str] = None
    linkedin_password: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_from_number: Optional[str] = None
    gemini_model: Optional[str] = None


@main_app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "API is running"}


@main_app.post("/api/config", response_model=Dict)
async def update_api_config(request: APIConfigRequest):
    """
    Update API configuration dynamically (BYOS - Bring Your Own Service).
    Frontend can submit API keys here.
    """
    config = {}
    
    if request.gemini_api_key:
        config["GEMINI_API_KEY"] = request.gemini_api_key
    
    if request.linkedin_email:
        config["LINKEDIN_EMAIL"] = request.linkedin_email
    
    if request.linkedin_password:
        config["LINKEDIN_PASSWORD"] = request.linkedin_password
    
    if request.twilio_account_sid:
        config["TWILIO_ACCOUNT_SID"] = request.twilio_account_sid
    
    if request.twilio_auth_token:
        config["TWILIO_AUTH_TOKEN"] = request.twilio_auth_token
    
    if request.twilio_from_number:
        config["TWILIO_FROM_NUMBER"] = request.twilio_from_number
    
    if request.gemini_model:
        config["GEMINI_MODEL"] = request.gemini_model
    else:
        # Default to gemini-2.5-flash
        config["GEMINI_MODEL"] = "gemini-2.5-flash"
    
    result = config_manager.update_config(config)
    
    # Reload environment variables
    load_dotenv(override=True)
    
    return result


@main_app.get("/api/config/status", response_model=Dict)
async def get_config_status():
    """Get current API configuration status"""
    return config_manager.get_config_status()


@main_app.post("/api/config/clear", response_model=Dict)
async def clear_config(keys: list):
    """Clear specific configuration keys"""
    return config_manager.clear_config(keys)


# Mount task apps with prefixes
main_app.mount("/task1", task1_app)
main_app.mount("/task2", task2_app)
main_app.mount("/task3", task3_app)


@main_app.get("/")
async def root():
    return {
        "message": "Aeroleads - Multi-Task API Server",
        "version": "1.0.0",
        "configuration": {
            "update_config": "POST /api/config",
            "config_status": "GET /api/config/status",
            "clear_config": "POST /api/config/clear"
        },
        "tasks": {
            "task1": {
                "name": "LinkedIn Leads Scraper",
                "prefix": "/task1",
                "endpoints": {
                    "scrape_leads": "POST /task1/scrape-leads",
                    "docs": "/task1/docs"
                }
            },
            "task2": {
                "name": "Autodialer",
                "prefix": "/task2",
                "endpoints": {
                    "upload_numbers": "POST /task2/upload-numbers",
                    "call_all": "POST /task2/call-all",
                    "ai_command": "POST /task2/ai-command",
                    "call_logs": "GET /task2/call-logs",
                    "docs": "/task2/docs"
                }
            },
            "task3": {
                "name": "AI Blog Generator",
                "prefix": "/task3",
                "endpoints": {
                    "generate_blogs": "POST /task3/generate-blogs",
                    "get_blogs": "GET /task3/blogs",
                    "search_blogs": "GET /task3/blogs/search",
                    "docs": "/task3/docs"
                }
            }
        },
        "api_docs": {
            "main": "/docs",
            "task1": "/task1/docs",
            "task2": "/task2/docs",
            "task3": "/task3/docs"
        }
    }


if __name__ == "__main__":
    # For development - use uvicorn with reload
    # For production - use gunicorn (see start.sh or Procfile)
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "prod":
        # Production mode - use gunicorn
        import subprocess
        port = os.getenv("PORT", "8000")
        subprocess.run([
            "gunicorn", "main:main_app",
            "--config", "gunicorn_config.py",
            "--bind", f"0.0.0.0:{port}"
        ])
    else:
        # Development mode - use uvicorn with reload
        port = int(os.getenv("PORT", 8000))
        host = os.getenv("HOST", "0.0.0.0")
        
        print(f"\nStarting server on http://{host}:{port}")
        print(f"API Documentation: http://{host}:{port}/docs")
        print(f"Task 1 (LinkedIn Scraper): http://{host}:{port}/task1/docs")
        print(f"Task 2 (Autodialer): http://{host}:{port}/task2/docs")
        print(f"Task 3 (Blog Generator): http://{host}:{port}/task3/docs")
        print("\n" + "=" * 80)
        
        uvicorn.run(
            "main:main_app",
            host=host,
            port=port,
            reload=True,
            reload_dirs=[".", "task1", "task2", "task3"]
        )

