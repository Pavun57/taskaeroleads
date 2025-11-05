# LinkedIn Leads Scraper API

FastAPI endpoint to scrape LinkedIn profiles based on natural language prompts using Gemini AI for keyword extraction.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Install ChromeDriver (if not already installed):
```bash
# Windows (using Chocolatey)
choco install chromedriver

# Or download from: https://chromedriver.chromium.org/
```

3. Set environment variables:
```bash
export GEMINI_API_KEY="your-gemini-api-key"
export LINKEDIN_EMAIL="your-test-linkedin-email"
export LINKEDIN_PASSWORD="your-test-linkedin-password"
```

## Usage

1. Start the FastAPI server:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

2. Make a POST request to `/scrape-leads`:
```bash
curl -X POST "http://localhost:8000/scrape-leads" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "i want the leads they are doing the food business in dubai"}'
```

## Response Format

```json
{
  "keywords": ["food", "business", "dubai", "restaurant"],
  "profiles": [
    {
      "name": "John Doe",
      "title": "Restaurant Owner",
      "company": "ABC Restaurant",
      "location": "Dubai, UAE",
      "skills": ["Food Service", "Management", "Hospitality"]
    }
  ],
  "csv_path": "mvp/task1/profiles.csv",
  "message": "Successfully scraped 20 profiles"
}
```

## Features

- Natural language prompt processing via Gemini API
- Automatic keyword extraction
- LinkedIn profile scraping (top 20 results)
- User-agent rotation
- CSV export
- Headless Chrome browser automation

## Notes

- Uses Selenium with Chrome in headless mode
- Implements delays to avoid detection
- Requires valid LinkedIn test account credentials
- CSV file saved to `task1/profiles.csv`

