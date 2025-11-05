# AI Blog Generator API

FastAPI-based AI Blog Generator that automatically creates and serves blog articles on programming or technology topics using the Gemini API.

## Features

- **AI-Powered Generation**: Uses Gemini API to generate complete blog articles
- **Structured Content**: Generates titles, summaries, and full body content
- **Local Storage**: Stores blogs in JSON files for persistence
- **Search Functionality**: Search blogs by title, summary, or content
- **RESTful API**: Clean endpoints for generating and retrieving blogs

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
GEMINI_API_KEY=your-gemini-api-key
```

3. Start the FastAPI server:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Generate Blogs

**POST /generate-blogs**
```json
{
  "topics": [
    "Introduction to Python Programming",
    "FastAPI vs Flask: A Comparison",
    "Understanding REST APIs"
  ]
}
```

### Get Blogs

**GET /blogs?limit=100**
Get all generated blogs (sorted by newest first).

**GET /blog/{blog_id}**
Get a specific blog by ID.

**GET /blogs/search?query=python&limit=20**
Search blogs by title, summary, or content.

### Manage Blogs

**DELETE /blog/{blog_id}**
Delete a specific blog.

**GET /blog-stats**
Get statistics about generated blogs.

## Response Format

### Blog Response
```json
{
  "blog_id": "uuid",
  "title": "Introduction to Python Programming",
  "summary": "A comprehensive guide to Python programming...",
  "content": "# Introduction to Python Programming\n\n...",
  "topic": "Introduction to Python Programming",
  "created_at": "2025-11-05T15:30:00"
}
```

### Generation Response
```json
{
  "success": true,
  "message": "Successfully generated 3 blog(s)",
  "blogs_generated": 3,
  "blogs": [
    {
      "blog_id": "uuid",
      "title": "...",
      "summary": "...",
      "content": "...",
      "topic": "...",
      "created_at": "..."
    }
  ]
}
```

## Usage Examples

### Generate Blogs
```bash
curl -X POST "http://localhost:8000/generate-blogs" \
  -H "Content-Type: application/json" \
  -d '{
    "topics": [
      "Introduction to Python Programming",
      "Understanding Async/Await in JavaScript"
    ]
  }'
```

### Get All Blogs
```bash
curl "http://localhost:8000/blogs?limit=10"
```

### Get Specific Blog
```bash
curl "http://localhost:8000/blog/{blog_id}"
```

### Search Blogs
```bash
curl "http://localhost:8000/blogs/search?query=python&limit=5"
```

## Storage

- **Blog Index**: `blogs/blog_index.json` - Contains metadata for all blogs
- **Individual Blogs**: `blogs/{blog_id}.json` - Full blog content stored separately
- Blogs are persisted across server restarts

## Blog Generation

Each generated blog includes:
- **Title**: Engaging, SEO-friendly title
- **Summary**: 2-3 sentence summary
- **Content**: Full article (800-1200 words) with:
  - Introduction
  - Multiple sections with headings
  - Code examples (for programming topics)
  - Practical insights
  - Conclusion
- **Markdown Formatting**: Proper headings, lists, code blocks

## Notes

- Blogs are generated asynchronously using Gemini API
- Each blog is stored in a separate JSON file for efficient retrieval
- Search functionality searches across title, summary, topic, and content
- Blog statistics include total blogs and word count metrics

