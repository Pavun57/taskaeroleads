import os
import google.generativeai as genai
from typing import List, Optional
import asyncio



class GeminiKeywordExtractor:
    """Extract search keywords from natural language prompts using Gemini API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set or not provided")
        
        genai.configure(api_key=self.api_key)
        model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.model = genai.GenerativeModel(model_name)
    
    async def extract_keywords(self, prompt: str) -> List[str]:
        """
        Extract LinkedIn search keywords from natural language prompt.
        
        Args:
            prompt: Natural language description (e.g., "food business in dubai")
        
        Returns:
            List of keywords for LinkedIn search
        """
        extraction_prompt = f"""
        Extract LinkedIn search keywords from the user's request. Create multiple keyword variations that combine industry and location.
        
        IMPORTANT RULES:
        1. Extract the INDUSTRY/BUSINESS TYPE mentioned
        2. Extract the LOCATION mentioned
        3. Create keyword combinations that combine industry + location
        4. Include variations like: "industry location", "industry company location", "industry business location"
        5. Do NOT add random job titles unless specifically requested in the prompt
        6. Keep keywords as combined phrases that work well for LinkedIn search
        
        EXAMPLES:
        - "food business dubai" → "food business dubai, food company dubai, restaurant dubai"
        - "food company ceo in dubai" → "food company ceo dubai, food business dubai, restaurant owner dubai"
        - "tech companies in london" → "tech companies london, tech london, technology london"
        - "restaurant owners in new york" → "restaurant owners new york, restaurant new york, food business new york"
        
        Return ONLY a comma-separated list of 3-5 keyword phrases. Each phrase should combine industry and location.
        No explanations, just keywords separated by commas.
        
        User request: "{prompt}"
        
        Keywords:
        """
        
        try:
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(extraction_prompt)
            )
            
            keywords_text = response.text.strip()
            # Clean and split keywords
            keywords = [
                kw.strip() 
                for kw in keywords_text.split(',') 
                if kw.strip()
            ]
            
            # Fallback: if Gemini returns unexpected format, extract manually
            if not keywords:
                keywords = self._fallback_extraction(prompt)
            
            return keywords[:7]  # Limit to 7 keywords max
        
        except Exception as e:
            print(f"Error extracting keywords: {e}")
            # Fallback to basic extraction
            return self._fallback_extraction(prompt)
    
    def _fallback_extraction(self, prompt: str) -> List[str]:
        """Fallback keyword extraction if Gemini fails"""
        # Basic keyword extraction - split by common words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 
                     'to', 'for', 'of', 'with', 'by', 'i', 'want', 'leads', 
                     'they', 'are', 'doing'}
        
        words = prompt.lower().split()
        keywords = [w for w in words if w not in stop_words and len(w) > 2]
        
        return keywords[:7] if keywords else ['business', 'professional']

