#!/bin/bash
set -e

# Start the Python API server on port 3001 (so it won’t conflict with Next.js on 3000)
echo "Starting FastAPI server on port 3001..."
uvicorn server:app --host 0.0.0.0 --port 3001 &

# Start the Telegram scanner module
echo "Starting Telegram scanner module..."
python3 EverionTGModule.py &

# Start the X (Twitter) scanner module
echo "Starting X scanner module..."
python3 EverionXModule.py &

# Start the Next.js application (listening on port 3000)
echo "Starting Next.js server..."
npm run start
