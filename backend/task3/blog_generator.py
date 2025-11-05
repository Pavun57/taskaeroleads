import os
import asyncio
import google.generativeai as genai
import logging
from typing import Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class BlogGenerator:
    """Generates blog articles using Gemini API"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize BlogGenerator with API key.
        
        Args:
            api_key: Optional Gemini API key. If not provided, reads from GEMINI_API_KEY env var.
        """
        api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY must be provided as parameter or set as environment variable")
        
        genai.configure(api_key=api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.model = genai.GenerativeModel(model_name)
    
    async def generate_blog(self, topic: str) -> Dict:
        """
        Generate a complete blog article from a topic or title.
        
        Args:
            topic: Blog title or short description
        
        Returns:
            Dictionary with title, summary, content, topic, and created_at
        """
        try:
            prompt = self._create_blog_prompt(topic)
            
            # Generate blog content
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(prompt)
            )
            
            blog_content = response.text.strip()
            
            # Parse the generated content
            parsed_blog = self._parse_blog_content(blog_content, topic)
            
            logger.info(f"Blog generated successfully for topic: {topic}")
            return parsed_blog
            
        except Exception as e:
            logger.error(f"Error generating blog for topic '{topic}': {e}")
            # Return a basic blog structure if generation fails
            return {
                'title': topic,
                'summary': f'An article about {topic}',
                'content': f'# {topic}\n\nContent generation failed: {str(e)}',
                'topic': topic,
                'created_at': datetime.now().isoformat()
            }
    
    def _create_blog_prompt(self, topic: str) -> str:
        """Create a prompt for Gemini to generate blog content"""
        return f"""Write a complete, well-structured blog article about: "{topic}"

Requirements:
1. Create an engaging title (not just "{topic}")
2. Write a 2-3 sentence summary that captures the essence of the article
3. Write comprehensive content with:
   - Introduction paragraph
   - At least 3-4 main sections with headings
   - Code examples if relevant (for programming topics)
   - Practical insights and examples
   - Conclusion paragraph
4. Use proper markdown formatting with headings (##, ###), lists, and code blocks
5. Make it informative, engaging, and at least 800-1200 words

Format your response as:
TITLE: [Your engaging title here]

SUMMARY: [2-3 sentence summary here]

CONTENT:
[Your full blog content here with markdown formatting]

Generate the blog article now:"""
    
    def _parse_blog_content(self, content: str, original_topic: str) -> Dict:
        """Parse the generated blog content into structured format"""
        try:
            # Extract title
            title = original_topic
            if "TITLE:" in content:
                title_line = content.split("TITLE:")[1].split("\n")[0].strip()
                if title_line:
                    title = title_line
            
            # Extract summary
            summary = f"An article about {original_topic}"
            if "SUMMARY:" in content:
                summary_section = content.split("SUMMARY:")[1].split("CONTENT:")[0].strip()
                if summary_section:
                    summary = summary_section
            
            # Extract content
            blog_content = content
            if "CONTENT:" in content:
                blog_content = content.split("CONTENT:")[1].strip()
            elif "TITLE:" in content:
                # If TITLE and SUMMARY are present but CONTENT marker missing
                if "SUMMARY:" in content:
                    blog_content = content.split("SUMMARY:")[1].split("\n", 1)[1].strip() if "\n" in content.split("SUMMARY:")[1] else content.split("SUMMARY:")[1].strip()
                else:
                    blog_content = content.split("TITLE:")[1].split("\n", 1)[1].strip() if "\n" in content.split("TITLE:")[1] else content.split("TITLE:")[1].strip()
            
            # Clean up content
            blog_content = blog_content.strip()
            
            # If content is too short, use the full response
            if len(blog_content) < 200:
                blog_content = content.strip()
                # Try to extract title and summary from the beginning
                lines = blog_content.split('\n')
                if len(lines) > 2:
                    potential_title = lines[0].strip()
                    if len(potential_title) < 100 and not potential_title.startswith('#'):
                        title = potential_title
                        if len(lines) > 1:
                            summary = lines[1].strip()[:200]
                            blog_content = '\n'.join(lines[2:]).strip()
            
            return {
                'title': title,
                'summary': summary,
                'content': blog_content,
                'topic': original_topic,
                'created_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error parsing blog content: {e}")
            # Fallback: return basic structure
            return {
                'title': original_topic,
                'summary': f'An article about {original_topic}',
                'content': content.strip(),
                'topic': original_topic,
                'created_at': datetime.now().isoformat()
            }

