from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
import os
import logging
import traceback
from dotenv import load_dotenv
from linkedin_scraper import LinkedInScraper
from gemini_keyword_extractor import GeminiKeywordExtractor

load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="LinkedIn Leads Scraper API")


class ScrapeRequest(BaseModel):
    prompt: str
    headless: bool = True  # Default to headless mode
    profile_count: int = 20  # Number of profiles to scrape (default 20)
    gemini_api_key: Optional[str] = None  # BYOS - Bring Your Own Service
    linkedin_email: Optional[str] = None  # BYOS - LinkedIn credentials
    linkedin_password: Optional[str] = None  # BYOS - LinkedIn credentials


class ProfileResponse(BaseModel):
    name: str
    title: str
    company: str
    location: str


class ScrapeResponse(BaseModel):
    keywords: List[str]
    profiles: List[ProfileResponse]
    csv_path: str
    message: str


@app.post("/scrape-leads", response_model=ScrapeResponse)
async def scrape_leads(request: ScrapeRequest):
    """
    Scrape LinkedIn leads based on natural language prompt.
    
    Example: "i want the leads they are doing the food business in dubai"
    """
    logger.info("=" * 80)
    logger.info(f"Received scrape request with prompt: {request.prompt}")
    
    try:
        # Extract keywords using Gemini API
        logger.info("Step 1: Extracting keywords using Gemini API...")
        # Use provided API key or fall back to environment variable
        api_key = request.gemini_api_key or os.getenv("GEMINI_API_KEY")
        keyword_extractor = GeminiKeywordExtractor(api_key=api_key)
        keywords = await keyword_extractor.extract_keywords(request.prompt)
        logger.info(f"Extracted keywords: {keywords}")
        
        if not keywords:
            logger.error("No keywords extracted from prompt")
            raise HTTPException(
                status_code=400,
                detail="Failed to extract keywords from prompt"
            )
        
        # Scrape LinkedIn profiles
        logger.info("Step 2: Initializing LinkedIn scraper...")
        # Use provided credentials or fall back to environment variables
        linkedin_email = request.linkedin_email or os.getenv("LINKEDIN_EMAIL")
        linkedin_password = request.linkedin_password or os.getenv("LINKEDIN_PASSWORD")
        scraper = LinkedInScraper(linkedin_email=linkedin_email, linkedin_password=linkedin_password)
        logger.info("LinkedIn scraper initialized")
        
        logger.info("Step 3: Starting profile scraping...")
        logger.info(f"Running in {'headless' if request.headless else 'visible'} mode")
        logger.info(f"Requested profile count: {request.profile_count}")
        profiles = await scraper.scrape_profiles(keywords, limit=request.profile_count, headless=request.headless)
        logger.info(f"Scraping completed. Found {len(profiles)} profiles")
        
        if not profiles:
            logger.warning("No profiles found for the given keywords")
            raise HTTPException(
                status_code=404,
                detail="No profiles found for the given keywords"
            )
        
        # Save to CSV
        logger.info("Step 4: Saving profiles to CSV...")
        csv_path = scraper.save_to_csv(profiles, "profiles.csv")
        logger.info(f"CSV saved to: {csv_path}")
        
        logger.info("=" * 80)
        logger.info("Request completed successfully!")
        
        return ScrapeResponse(
            keywords=keywords,
            profiles=[ProfileResponse(**profile) for profile in profiles],
            csv_path=csv_path,
            message=f"Successfully scraped {len(profiles)} profiles"
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error("=" * 80)
        logger.error(f"ERROR in scrape_leads: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        logger.error("=" * 80)
        raise HTTPException(
            status_code=500,
            detail=f"Error scraping leads: {str(e)}"
        )


@app.get("/")
async def root():
    return {
        "message": "LinkedIn Leads Scraper API",
        "endpoint": "/scrape-leads",
        "usage": "POST a JSON body with 'prompt' field containing your search query"
    }

