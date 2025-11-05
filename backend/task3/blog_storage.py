import os
import json
import uuid
from typing import List, Dict, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BlogStorage:
    """Manages blog storage and retrieval"""
    
    def __init__(self, storage_dir: str = "blogs"):
        self.storage_dir = storage_dir
        self.index_file = os.path.join(storage_dir, "blog_index.json")
        self.blogs: Dict[str, Dict] = {}
        
        # Create storage directory if it doesn't exist
        os.makedirs(storage_dir, exist_ok=True)
        
        # Load existing blogs
        self._load_index()
    
    def _load_index(self):
        """Load blog index from file"""
        try:
            if os.path.exists(self.index_file):
                with open(self.index_file, 'r', encoding='utf-8') as f:
                    self.blogs = json.load(f)
                logger.info(f"Loaded {len(self.blogs)} blogs from index")
        except Exception as e:
            logger.error(f"Error loading blog index: {e}")
            self.blogs = {}
    
    def _save_index(self):
        """Save blog index to file"""
        try:
            with open(self.index_file, 'w', encoding='utf-8') as f:
                json.dump(self.blogs, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving blog index: {e}")
    
    def _save_blog_file(self, blog_id: str, blog_data: Dict):
        """Save individual blog to a separate file"""
        try:
            blog_file = os.path.join(self.storage_dir, f"{blog_id}.json")
            with open(blog_file, 'w', encoding='utf-8') as f:
                json.dump(blog_data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving blog file {blog_id}: {e}")
    
    def _load_blog_file(self, blog_id: str) -> Optional[Dict]:
        """Load individual blog from file"""
        try:
            blog_file = os.path.join(self.storage_dir, f"{blog_id}.json")
            if os.path.exists(blog_file):
                with open(blog_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading blog file {blog_id}: {e}")
        return None
    
    def save_blog(self, blog_data: Dict) -> str:
        """Save a blog and return its ID"""
        blog_id = str(uuid.uuid4())
        
        # Add blog_id to blog data
        blog_data['blog_id'] = blog_id
        
        # Save to index
        self.blogs[blog_id] = {
            'blog_id': blog_id,
            'title': blog_data.get('title', ''),
            'summary': blog_data.get('summary', ''),
            'topic': blog_data.get('topic', ''),
            'created_at': blog_data.get('created_at', datetime.now().isoformat())
        }
        
        # Save full blog to separate file
        self._save_blog_file(blog_id, blog_data)
        
        # Save index
        self._save_index()
        
        logger.info(f"Blog saved: {blog_id} - {blog_data.get('title', '')}")
        return blog_id
    
    def get_all_blogs(self, limit: int = 100) -> List[Dict]:
        """Get all blogs, sorted by creation date (newest first)"""
        blogs = []
        
        for blog_id in self.blogs.keys():
            blog = self._load_blog_file(blog_id)
            if blog:
                blogs.append(blog)
        
        # Sort by created_at (newest first)
        blogs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return blogs[:limit]
    
    def get_blog_by_id(self, blog_id: str) -> Optional[Dict]:
        """Get a specific blog by ID"""
        if blog_id not in self.blogs:
            return None
        
        return self._load_blog_file(blog_id)
    
    def search_blogs(self, query: str, limit: int = 20) -> List[Dict]:
        """Search blogs by title, summary, or content"""
        query_lower = query.lower()
        matching_blogs = []
        
        for blog_id in self.blogs.keys():
            blog = self._load_blog_file(blog_id)
            if blog:
                # Search in title, summary, topic, and content
                title = blog.get('title', '').lower()
                summary = blog.get('summary', '').lower()
                topic = blog.get('topic', '').lower()
                content = blog.get('content', '').lower()
                
                if (query_lower in title or 
                    query_lower in summary or 
                    query_lower in topic or 
                    query_lower in content):
                    matching_blogs.append(blog)
        
        # Sort by relevance (title matches first) then by date
        matching_blogs.sort(
            key=lambda x: (
                query_lower not in x.get('title', '').lower(),
                x.get('created_at', '')
            ),
            reverse=True
        )
        
        return matching_blogs[:limit]
    
    def delete_blog(self, blog_id: str) -> Dict:
        """Delete a blog by ID"""
        if blog_id not in self.blogs:
            return {
                'success': False,
                'message': f'Blog with ID {blog_id} not found'
            }
        
        # Remove from index
        del self.blogs[blog_id]
        self._save_index()
        
        # Delete blog file
        blog_file = os.path.join(self.storage_dir, f"{blog_id}.json")
        try:
            if os.path.exists(blog_file):
                os.remove(blog_file)
        except Exception as e:
            logger.error(f"Error deleting blog file {blog_id}: {e}")
        
        return {
            'success': True,
            'message': f'Blog {blog_id} deleted successfully'
        }
    
    def get_statistics(self) -> Dict:
        """Get statistics about stored blogs"""
        total = len(self.blogs)
        
        if total == 0:
            return {
                'total_blogs': 0,
                'total_words': 0,
                'average_words_per_blog': 0
            }
        
        total_words = 0
        for blog_id in self.blogs.keys():
            blog = self._load_blog_file(blog_id)
            if blog:
                content = blog.get('content', '')
                total_words += len(content.split())
        
        return {
            'total_blogs': total,
            'total_words': total_words,
            'average_words_per_blog': round(total_words / total, 2) if total > 0 else 0
        }

