#!/bin/bash
set -e

echo "Starting development server..."
npm run dev

echo "Starting FastAPI server on port 3000..."
uvicorn server:app --host 0.0.0.0 --port 3000 &

echo "Starting Telegram scanner module..."
python3 EverionTGModule.py &

echo "Starting X (Twitter) scanner module..."
python3 EverionXModule.py &

# Wait indefinitely so the container does not exit.
wait
