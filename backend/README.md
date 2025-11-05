# TaskAero Leads - Multi-Task API Platform

A comprehensive FastAPI-based platform combining three powerful tools: LinkedIn Lead Scraping, Autodialer, and AI Blog Generator.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run the Server

**Development Mode:**
```bash
python main.py
```

**Production Mode (with Gunicorn):**
```bash
python main.py prod
# or
gunicorn main:main_app --config gunicorn_config.py --bind 0.0.0.0:8000
```

The server will start on `http://localhost:8000` (or your configured port).

## 📦 Deployment on Render

### Quick Deploy

1. **Create a new Web Service** on Render
2. **Connect your repository**
3. **Configure Build & Start Commands:**
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn main:main_app --config gunicorn_config.py --bind 0.0.0.0:$PORT`
4. **Set Environment Variables** (optional - can be set via API):
   - `PORT` (auto-set by Render)
   - `GEMINI_API_KEY` (optional)
   - `LINKEDIN_EMAIL` (optional)
   - `LINKEDIN_PASSWORD` (optional)
   - `TWILIO_ACCOUNT_SID` (optional)
   - `TWILIO_AUTH_TOKEN` (optional)
   - `TWILIO_FROM_NUMBER` (optional)

### Using Procfile

Render will automatically detect the `Procfile` and use it for the start command.

### Using render.yaml

If you have a `render.yaml` file, you can use it to configure the service declaratively.

## 📋 Tasks Overview

### Task 1: LinkedIn Leads Scraper (`/task1`)

Scrape LinkedIn profiles based on natural language prompts.

**Features:**
- Natural language prompt processing via Gemini API
- Automatic keyword extraction
- LinkedIn profile scraping (top 20+ results)
- User-agent rotation
- CSV export
- Pagination support

**Key Endpoints:**
- `POST /task1/scrape-leads` - Scrape leads from natural language prompt
- `GET /task1/docs` - API documentation

**Example Request:**
```json
{
  "prompt": "i want the leads they are doing the food business in dubai",
  "profile_count": 50
}
```

**Note:** The scraper always runs in headless mode (no browser window).

### Task 2: Autodialer (`/task2`)

Automatically process and call phone numbers using Twilio or simulated logic.

**Features:**
- Upload phone numbers via JSON or file
- Call execution (Twilio API or simulated)
- Call logging with status, duration, timestamps
- AI-driven natural language commands
- Real-time call status tracking

**Key Endpoints:**
- `POST /task2/upload-numbers` - Upload phone numbers
- `POST /task2/call-all` - Call all uploaded numbers
- `POST /task2/ai-command` - AI natural language commands
- `GET /task2/call-logs` - Get call logs
- `GET /task2/docs` - API documentation

**Example AI Command:**
```json
{
  "command": "Call all uploaded numbers"
}
```

### Task 3: AI Blog Generator (`/task3`)

Automatically generate blog articles on programming or technology topics.

**Features:**
- AI-powered blog generation using Gemini
- Complete articles with titles, summaries, and content
- Local JSON file storage
- Search functionality
- Full CRUD operations

**Key Endpoints:**
- `POST /task3/generate-blogs` - Generate blogs from topics
- `GET /task3/blogs` - Get all blogs
- `GET /task3/blogs/search` - Search blogs
- `GET /task3/docs` - API documentation

**Example Request:**
```json
{
  "topics": [
    "Introduction to Python Programming",
    "FastAPI vs Flask: A Comparison"
  ]
}
```

## 🔧 Configuration

### BYOS (Bring Your Own Service) - Frontend Integration

The API supports dynamic API key configuration from the frontend. Users can provide their own API keys directly in API requests.

**Configuration Endpoints:**
- `POST /api/config` - Update API keys dynamically
- `GET /api/config/status` - Check current configuration status
- `POST /api/config/clear` - Clear specific configuration keys

**Example Configuration Request:**
```json
POST /api/config
{
  "gemini_api_key": "your-gemini-api-key",
  "linkedin_email": "your-email@example.com",
  "linkedin_password": "your-password",
  "twilio_account_sid": "your-twilio-sid",
  "twilio_auth_token": "your-twilio-token",
  "twilio_from_number": "+1234567890",
  "gemini_model": "gemini-2.5-flash"
}
```

**Dynamic API Keys in Requests:**

Each task endpoint also accepts API keys directly in the request:

**Task 1 - Scrape Leads:**
```json
POST /task1/scrape-leads
{
  "prompt": "food business in dubai",
  "gemini_api_key": "your-key-here",
  "profile_count": 20
}
```

**Task 2 - AI Command:**
```json
POST /task2/ai-command
{
  "command": "Call all uploaded numbers",
  "gemini_api_key": "your-key-here"
}
```

**Task 3 - Generate Blogs:**
```json
POST /task3/generate-blogs
{
  "topics": ["Introduction to Python"],
  "gemini_api_key": "your-key-here"
}
```

### Environment Variables (Optional Backend Setup)

Configuration can be set via the API endpoints (recommended) or stored in `.env` file for persistence.

**Required:**
- `GEMINI_API_KEY` - Gemini API key for AI features (default model: gemini-2.5-flash)
- `GEMINI_MODEL` - Gemini model name (default: gemini-2.5-flash)

**Task 1 (LinkedIn Scraper):**
- `LINKEDIN_EMAIL` - Your LinkedIn email
- `LINKEDIN_PASSWORD` - Your LinkedIn password

**Task 2 (Autodialer):**
- `TWILIO_ACCOUNT_SID` - Twilio Account SID (optional)
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token (optional)
- `TWILIO_FROM_NUMBER` - Twilio phone number (optional)

**Server:**
- `PORT` - Server port (default: 8000)
- `HOST` - Server host (default: 0.0.0.0)

## 📚 API Documentation

Once the server is running, access interactive API documentation:

- **Main API**: http://localhost:8000/docs
- **Config API**: http://localhost:8000/api/config (for frontend BYOS)
- **Task 1 Docs**: http://localhost:8000/task1/docs
- **Task 2 Docs**: http://localhost:8000/task2/docs
- **Task 3 Docs**: http://localhost:8000/task3/docs

### Frontend Integration

The API is designed for frontend integration with BYOS support:

1. **Configuration Endpoint**: Frontend can submit API keys via `POST /api/config`
2. **Per-Request Keys**: Each task endpoint accepts `gemini_api_key` in the request body
3. **CORS Enabled**: All origins are allowed for frontend integration
4. **Status Check**: Frontend can check configuration status via `GET /api/config/status`

## 🗂️ Project Structure

```
taskaeroleads/
├── main.py                 # Main server combining all tasks
├── setup.py                # Interactive setup script
├── requirements.txt        # Common dependencies
├── README.md              # This file
├── .env                    # Environment variables (generated)
│
├── task1/                  # LinkedIn Scraper
│   ├── app.py
│   ├── linkedin_scraper.py
│   ├── gemini_keyword_extractor.py
│   └── requirements.txt
│
├── task2/                  # Autodialer
│   ├── app.py
│   ├── call_manager.py
│   ├── phone_manager.py
│   ├── call_logger.py
│   ├── ai_command_processor.py
│   └── requirements.txt
│
└── task3/                  # Blog Generator
    ├── app.py
    ├── blog_generator.py
    ├── blog_storage.py
    └── requirements.txt
```

## 💾 Data Storage

### Task 1
- `task1/profiles.csv` - Scraped LinkedIn profiles

### Task 2
- `task2/phone_numbers.json` - Uploaded phone numbers
- `task2/call_logs.json` - Call logs

### Task 3
- `task3/blogs/blog_index.json` - Blog metadata index
- `task3/blogs/{blog_id}.json` - Individual blog files

## 🔐 Security Notes

- Never commit `.env` file to version control
- Use strong passwords for LinkedIn accounts
- Keep API keys secure
- Consider using environment-specific `.env` files for production

## 🛠️ Troubleshooting

### ChromeDriver Issues
If you encounter ChromeDriver errors in Task 1:
- Ensure Chrome browser is installed
- Run: `pip install --upgrade webdriver-manager`

### Twilio Not Working
If Twilio calls fail in Task 2:
- Verify your Twilio credentials
- Check your Twilio account balance
- The system will use simulated mode if Twilio is not configured

### Gemini API Errors
If Gemini API fails:
- Verify your API key is correct
- Check your API quota/limits
- Ensure internet connection is stable

## 📝 License

This project is for internal use only.

## 🆘 Support

For issues or questions, check the individual task documentation:
- Task 1: `task1/README.md`
- Task 2: `task2/README.md`
- Task 3: `task3/README.md`
 
