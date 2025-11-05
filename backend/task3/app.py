from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import logging
import traceback
from dotenv import load_dotenv
from blog_generator import BlogGenerator
from blog_storage import BlogStorage

load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Blog Generator API")

# Initialize managers
# Blog generator will be created per request with dynamic API key
blog_storage = BlogStorage()


class BlogGenerationRequest(BaseModel):
    topics: List[str]  # List of blog titles or short descriptions
    gemini_api_key: Optional[str] = None  # BYOS - Bring Your Own Service


class BlogResponse(BaseModel):
    blog_id: str
    title: str
    summary: str
    content: str
    topic: str
    created_at: str


class GenerationResponse(BaseModel):
    success: bool
    message: str
    blogs_generated: int
    blogs: List[BlogResponse]


@app.post("/generate-blogs", response_model=GenerationResponse)
async def generate_blogs(request: BlogGenerationRequest):
    """
    Generate blog articles from a list of topics/titles.
    
    Example:
    {
        "topics": [
            "Introduction to Python Programming",
            "FastAPI vs Flask: A Comparison",
            "Understanding REST APIs"
        ]
    }
    """
    try:
        logger.info(f"Generating blogs for {len(request.topics)} topics")
        
        # Create blog generator with dynamic API key
        api_key = request.gemini_api_key or os.getenv("GEMINI_API_KEY")
        blog_generator = BlogGenerator(api_key=api_key)
        
        generated_blogs = []
        
        for topic in request.topics:
            logger.info(f"Generating blog for topic: {topic}")
            blog = await blog_generator.generate_blog(topic)
            
            # Save blog to storage
            blog_id = blog_storage.save_blog(blog)
            blog['blog_id'] = blog_id
            
            generated_blogs.append(blog)
            logger.info(f"Blog generated and saved: {blog_id}")
        
        return GenerationResponse(
            success=True,
            message=f"Successfully generated {len(generated_blogs)} blog(s)",
            blogs_generated=len(generated_blogs),
            blogs=[BlogResponse(**blog) for blog in generated_blogs]
        )
    
    except Exception as e:
        logger.error(f"Error generating blogs: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/blogs", response_model=List[BlogResponse])
async def get_all_blogs(limit: int = 100):
    """
    Get all generated blogs.
    """
    try:
        blogs = blog_storage.get_all_blogs(limit=limit)
        return [BlogResponse(**blog) for blog in blogs]
    except Exception as e:
        logger.error(f"Error getting blogs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/blog/{blog_id}", response_model=BlogResponse)
async def get_blog_by_id(blog_id: str):
    """
    Get a specific blog by ID.
    """
    try:
        blog = blog_storage.get_blog_by_id(blog_id)
        if not blog:
            raise HTTPException(status_code=404, detail=f"Blog with ID {blog_id} not found")
        return BlogResponse(**blog)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting blog: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/blogs/search", response_model=List[BlogResponse])
async def search_blogs(query: str, limit: int = 20):
    """
    Search blogs by title or content.
    """
    try:
        blogs = blog_storage.search_blogs(query, limit=limit)
        return [BlogResponse(**blog) for blog in blogs]
    except Exception as e:
        logger.error(f"Error searching blogs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/blog/{blog_id}", response_model=Dict)
async def delete_blog(blog_id: str):
    """
    Delete a blog by ID.
    """
    try:
        result = blog_storage.delete_blog(blog_id)
        if not result['success']:
            raise HTTPException(status_code=404, detail=result['message'])
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting blog: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/blog-stats", response_model=Dict)
async def get_blog_stats():
    """
    Get statistics about generated blogs.
    """
    try:
        stats = blog_storage.get_statistics()
        return stats
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    return {
        "message": "AI Blog Generator API",
        "endpoints": {
            "generate_blogs": "POST /generate-blogs",
            "get_all_blogs": "GET /blogs",
            "get_blog": "GET /blog/{blog_id}",
            "search_blogs": "GET /blogs/search?query=...",
            "delete_blog": "DELETE /blog/{blog_id}",
            "blog_stats": "GET /blog-stats"
        }
    }

