#!/bin/bash
# Start script for Render deployment

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run gunicorn with uvicorn workers
exec gunicorn main:main_app \
    --config gunicorn_config.py \
    --bind 0.0.0.0:${PORT:-8000}

