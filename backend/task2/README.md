# Autodialer API

FastAPI-based autodialer backend that automatically processes and calls phone numbers using Twilio API or simulated logic. Supports AI-driven natural language commands via Gemini.

## Features

- **Phone Number Management**: Upload phone numbers via JSON or file
- **Call Execution**: Make calls using Twilio API or simulated mode
- **Call Logging**: Track call status, duration, and timestamps
- **AI Commands**: Natural language processing for call commands
- **Real-time Status**: Get call results with answered, failed, or queued status

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables (optional for Twilio):
```bash
# For Twilio API (real calls)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=your-twilio-number

# Required for AI commands
GEMINI_API_KEY=your-gemini-api-key
```

If Twilio credentials are not provided, the system will use simulated call logic.

3. Start the FastAPI server:
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Upload Phone Numbers

**POST /upload-numbers**
```json
{
  "phone_numbers": ["+1234567890", "0987654321"]
}
```

**POST /upload-numbers-file**
Upload a CSV/TXT file with one phone number per line.

### Make Calls

**POST /call-all**
Call all uploaded phone numbers.

**POST /call-number/{phone_number}**
Call a specific phone number.

### AI Commands

**POST /ai-command**
```json
{
  "command": "Call all uploaded numbers"
}
```
or
```json
{
  "command": "Call the number 987655392"
}
```

### Get Information

**GET /call-logs?limit=100**
Get call logs with status, duration, and timestamp.

**GET /phone-numbers**
Get all uploaded phone numbers.

**DELETE /phone-numbers/{phone_number}**
Delete a specific phone number.

## Response Formats

### Call Response
```json
{
  "call_id": "uuid",
  "phone_number": "+1234567890",
  "status": "answered|failed|queued",
  "message": "Call status message"
}
```

### Call Log Response
```json
{
  "call_id": "uuid",
  "phone_number": "+1234567890",
  "status": "answered",
  "duration": 15.5,
  "timestamp": "2025-11-05 15:30:00",
  "error_message": null
}
```

## Usage Examples

### Upload and Call Numbers
```bash
# Upload numbers
curl -X POST "http://localhost:8000/upload-numbers" \
  -H "Content-Type: application/json" \
  -d '{"phone_numbers": ["+1234567890", "+0987654321"]}'

# Call all
curl -X POST "http://localhost:8000/call-all"

# Call specific number
curl -X POST "http://localhost:8000/call-number/+1234567890"
```

### AI Commands
```bash
# Call all numbers
curl -X POST "http://localhost:8000/ai-command" \
  -H "Content-Type: application/json" \
  -d '{"command": "Call all uploaded numbers"}'

# Call specific number
curl -X POST "http://localhost:8000/ai-command" \
  -H "Content-Type: application/json" \
  -d '{"command": "Call the number 987655392"}'
```

## Storage

- Phone numbers are stored in `phone_numbers.json`
- Call logs are stored in `call_logs.json`

## Notes

- Without Twilio credentials, calls are simulated with realistic behavior
- Simulated calls have 60% success rate, 20% queued, 20% failed
- Phone numbers are normalized (digits only, + prefix preserved)
- Minimum 10 digits required for valid phone numbers

