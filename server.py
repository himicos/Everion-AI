from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import os
from pathlib import Path
from typing import List, Dict, Union
from datetime import datetime
import traceback
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

app = FastAPI(title="Everion Insights API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define file paths with absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TELEGRAM_INSIGHTS_FILE = os.path.join(BASE_DIR, "telegram_insights.json")
MARKET_INSIGHTS_FILE = os.path.join(BASE_DIR, "market_insights.json")

class InsightFileHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith(('market_insights.json', 'telegram_insights.json')):
            print(f"\nFile change detected: {event.src_path}")

def ensure_files_exist():
    """Ensure insight files exist and are properly initialized."""
    for file_path in [TELEGRAM_INSIGHTS_FILE, MARKET_INSIGHTS_FILE]:
        try:
            if not os.path.exists(file_path):
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump([], f, indent=4)
                print(f"Created new file: {file_path}")
            
            # Verify file is readable and valid JSON
            with open(file_path, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    if not isinstance(data, list):
                        print(f"Warning: {file_path} contains invalid data, resetting...")
                        with open(file_path, 'w', encoding='utf-8') as f:
                            json.dump([], f, indent=4)
                except json.JSONDecodeError:
                    print(f"Warning: {file_path} contains invalid JSON, resetting...")
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump([], f, indent=4)
        except Exception as e:
            print(f"Error ensuring file {file_path}: {e}")
            traceback.print_exc()

def load_insights(file_path: str) -> List[Dict]:
    """Helper to load insights from a given JSON file with better error handling."""
    try:
        if os.path.exists(file_path):
            with open(file_path, "r", encoding='utf-8') as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
    except Exception as e:
        print(f"Error loading insights from {file_path}: {e}")
        traceback.print_exc()
    return []

def save_insights(file_path: str, insights: List[Dict]) -> None:
    """Helper to save insights to a given JSON file with proper encoding."""
    try:
        with open(file_path, "w", encoding='utf-8') as f:
            json.dump(insights, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving insights to {file_path}: {e}")
        traceback.print_exc()

@app.get("/")
async def read_root() -> Dict[str, Union[str, List[str]]]:
    """Root endpoint to check if the server is running."""
    return {
        "message": "Everion Insights API is running!",
        "available_endpoints": ["/insights", "/insights/telegram", "/insights/market", "/insights/{identifier}"],
        "status": "active"
    }

@app.get("/insights")
async def get_all_insights():
    """Fetch all insights (both Telegram and Market) combined."""
    telegram_insights = load_insights(TELEGRAM_INSIGHTS_FILE)
    market_insights = load_insights(MARKET_INSIGHTS_FILE)
    all_insights = telegram_insights + market_insights

    try:
        all_insights.sort(
            key=lambda x: datetime.fromisoformat(x.get("timestamp", "1970-01-01T00:00:00")),
            reverse=True,
        )
    except Exception as e:
        print(f"Sorting error: {e}")
        traceback.print_exc()

    return JSONResponse(
        content=all_insights,
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        },
    )

@app.get("/insights/telegram")
async def get_telegram_insights():
    """Fetch all Telegram insights."""
    insights = load_insights(TELEGRAM_INSIGHTS_FILE)
    return JSONResponse(
        content=insights,
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        },
    )

@app.get("/insights/market")
async def get_market_insights():
    """Fetch all Market (X) insights."""
    insights = load_insights(MARKET_INSIGHTS_FILE)
    return JSONResponse(
        content=insights,
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        },
    )

@app.delete("/insights/{identifier}")
async def delete_insight(identifier: str):
    """Delete a specific insight by identifier."""
    telegram_insights = load_insights(TELEGRAM_INSIGHTS_FILE)
    market_insights = load_insights(MARKET_INSIGHTS_FILE)

    # Update telegram insights - look for contract match
    updated_telegram = [i for i in telegram_insights if i.get("contract") != identifier]
    if len(updated_telegram) != len(telegram_insights):
        save_insights(TELEGRAM_INSIGHTS_FILE, updated_telegram)
        print(f"Deleted from telegram_insights.json: {identifier}")

    # Update market insights - look for both tweet_id and contract
    updated_market = [
        i for i in market_insights 
        if not (
            (i.get("tweet_id") == identifier) or 
            (i.get("contract") == identifier)
        )
    ]
    if len(updated_market) != len(market_insights):
        save_insights(MARKET_INSIGHTS_FILE, updated_market)
        print(f"Deleted from market_insights.json: {identifier}")

    if len(updated_telegram) == len(telegram_insights) and len(updated_market) == len(market_insights):
        print(f"No insight found with identifier: {identifier}")
        return JSONResponse(
            content={"message": "No insight found with the given identifier"},
            status_code=404
        )

    return {"message": f"Insight with identifier {identifier} deleted successfully"}

@app.get("/insights/{identifier}")
async def get_insight_by_identifier(identifier: str):
    """Fetch an insight by identifier with improved error handling."""
    telegram_insights = load_insights(TELEGRAM_INSIGHTS_FILE)
    market_insights = load_insights(MARKET_INSIGHTS_FILE)
    all_insights = telegram_insights + market_insights

    for insight in all_insights:
        if insight.get("contract") == identifier or insight.get("tweet_id") == identifier:
            return JSONResponse(
                content=insight,
                headers={
                    "Access-Control-Allow-Origin": "http://localhost:3000",
                    "Access-Control-Allow-Credentials": "true",
                },
            )
    
    return JSONResponse(
        content={"message": "Insight not found"},
        status_code=404,
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true",
        },
    )

if __name__ == "__main__":
    import uvicorn

    # Ensure insight files exist and are valid
    ensure_files_exist()

    # Set up file watcher
    event_handler = InsightFileHandler()
    observer = Observer()
    observer.schedule(event_handler, path=BASE_DIR, recursive=False)
    observer.start()

    try:
        # IMPORTANT: Bind to 0.0.0.0 on port 3000 for Fly.io routing
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=3000,
            log_level="info"
        )
    finally:
        observer.stop()
        observer.join()
