import re
import asyncio
import aiohttp
import json
from datetime import datetime
from urllib.parse import quote
from telethon import TelegramClient, events
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()
print("Environment variables:", os.environ)

def get_int_env(var_name):
    value = os.getenv(var_name)
    if not value:
        raise ValueError(f"❌ Environment variable {var_name} is not set!")
    if value.startswith("-"):
        value = value[1:]
    return int(value)

# Telegram API credentials
api_id = int(os.getenv("TELEGRAM_API_ID"))
api_hash = os.getenv("TELEGRAM_API_HASH")

# Use BOT_API_KEY from .env (this replaces the need for a phone number)
bot_api_key = os.getenv("BOT_API_KEY")
if not bot_api_key:
    raise ValueError("❌ BOT_API_KEY is not set in the environment variables.")

# Configuration constants
INSIGHTS_FILE = "telegram_insights.json"

# No longer restricting to specific source chats – listen to any chat
target_channel_id = get_int_env("TARGET_CHANNEL_ID")

# Regex pattern for detecting Sui contract addresses
contract_regex = r"(0x[a-fA-F0-9]{64}::[a-zA-Z0-9_]+::[a-zA-Z0-9_]+)"

# API configurations for Blockvision
BLOCKVISION_API_URL = "https://api.blockvision.org/v2/sui/coin/detail"
BLOCKVISION_HOLDERS_API_URL = "https://api.blockvision.org/v2/sui/coin/holders"
BLOCKVISION_API_KEY = os.getenv("BLOCKVISION_API_KEY")

# Debugging: Print the loaded values (optional)
print(f"✅ Loaded Environment Variables:")
print(f"🔹 API ID: {api_id}")
print(f"🔹 API Hash: {api_hash}")
print(f"🔹 BOT API Key: {'✅ Set' if bot_api_key else '❌ Not Set'}")
print(f"🔹 Target Channel ID: {target_channel_id}")
print(f"🔹 Blockvision API Key: {'✅ Set' if BLOCKVISION_API_KEY else '❌ Not Set'}")

# Global dictionary to track pending contracts and related messages
pending_contracts = {}

def format_number(number):
    """
    Format a number to use K for thousands and M for millions.
    """
    try:
        number = float(number)
        if number >= 1_000_000:
            return f"{number/1_000_000:.1f}M"
        elif number >= 1_000:
            return f"{number/1_000:.1f}K"
        else:
            return f"{number:.1f}"
    except (ValueError, TypeError):
        return "N/A"

def save_insight_to_json(insight):
    """
    Append a new insight to the JSON file.
    """
    try:
        try:
            with open(INSIGHTS_FILE, "r") as f:
                insights = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            insights = []  # Start with an empty list if file not found or invalid
        
        insights.append(insight)
        with open(INSIGHTS_FILE, "w") as f:
            json.dump(insights, f, indent=4)
    except Exception as e:
        print(f"Error saving insight: {e}")

# Initialize the Telegram client (using a session name for the bot)
client = TelegramClient("session_bot", api_id, api_hash)

async def fetch_blockvision_data(coin_type):
    """Fetch coin data from Blockvision API."""
    encoded_coin_type = quote(coin_type, safe="")
    url = f"{BLOCKVISION_API_URL}?coinType={encoded_coin_type}"
    headers = {"accept": "application/json", "x-api-key": BLOCKVISION_API_KEY}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                print("Blockvision API Response:", data)
                return data.get("result", {})
            else:
                print(f"Failed to fetch data from Blockvision: {response.status}")
                return None

async def fetch_blockvision_holders(coin_type, page_index=1, page_size=10):
    """Fetch coin holders data from Blockvision API."""
    encoded_coin_type = quote(coin_type, safe="")
    url = f"{BLOCKVISION_HOLDERS_API_URL}?coinType={encoded_coin_type}&pageIndex={page_index}&pageSize={page_size}"
    headers = {"accept": "application/json", "x-api-key": BLOCKVISION_API_KEY}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status == 200:
                data = await response.json()
                print("Blockvision Holders API Response:", data)
                return data.get("result", {}).get("data", [])
            else:
                print(f"Failed to fetch holders data from Blockvision: {response.status}")
                return None

# Listen to any new message in any chat where the bot is present
@client.on(events.NewMessage)
async def handler(event):
    sender = await event.get_sender()
    username = f"@{sender.username}" if sender.username else "Unknown"
    message_text = event.message.text or ""
    
    # Detect a Sui contract in the message text
    match = re.search(contract_regex, message_text)
    if match:
        try:
            contract = match.group(1)
            print(f"Detected contract: {contract}")
            pending_contracts[contract] = {"message": event.message, "sender": username}
            
            # Fetch data from Blockvision API for the detected contract
            blockvision_data = await fetch_blockvision_data(contract)
            if blockvision_data:
                name = blockvision_data.get("name", "N/A")
                symbol = blockvision_data.get("symbol", "N/A")
                price = blockvision_data.get("price", "N/A")
                price_change_24h = blockvision_data.get("priceChangePercentage24H", "N/A")
                total_supply = format_number(blockvision_data.get("totalSupply", "N/A"))
                holders = format_number(blockvision_data.get("holders", "N/A"))
                market_cap = format_number(blockvision_data.get("marketCap", "N/A"))
                is_verified = blockvision_data.get("verified", "N/A")
                scam_flag = "None" if blockvision_data.get("scamFlag", 0) == 0 else "Scam Detected"
                
                # Fetch top 10 holders data
                holders_data = await fetch_blockvision_holders(contract)
                if holders_data:
                    top_10_holders_percentage = sum(float(holder.get("percentage", 0)) for holder in holders_data)
                    top_10_holders_percentage = round(top_10_holders_percentage * 100, 2)
                else:
                    top_10_holders_percentage = "N/A"
                
                # Build the insight dictionary
                insight = {
                    "contract": contract,
                    "sender": username,
                    "name": name,
                    "symbol": symbol,
                    "price": price,
                    "price_change_24h": f"{price_change_24h}%",
                    "total_supply": total_supply,
                    "holders": holders,
                    "market_cap": market_cap,
                    "top_10_holders_percentage": f"{top_10_holders_percentage}%",
                    "verified": is_verified,
                    "scam_flag": scam_flag,
                    "timestamp": datetime.utcnow().isoformat(),
                    "source": "telegram"
                }
                
                # Save the insight to a JSON file
                save_insight_to_json(insight)
                
                # Build a message to be sent to the target channel
                combined_text = (
                    f"Contract Detected:\n{contract}\n\n"
                    f"Sent by: {username}\n\n"
                    f"Name: {name}\n"
                    f"Symbol: {symbol}\n"
                    f"Price: {price}\n"
                    f"24h Price Change: {price_change_24h}%\n"
                    f"Total Supply: {total_supply}\n"
                    f"Holders: {holders}\n"
                    f"Market Cap: {market_cap}\n"
                    f"Top 10 Holders: {top_10_holders_percentage}%\n"
                    f"Verified: {is_verified}\n"
                    f"Scam Flag: {scam_flag}\n"
                    f"Source: telegram\n"
                )
                
                await client.send_message(target_channel_id, combined_text)
                debug_json = json.dumps(insight, indent=4)
                await client.send_message(target_channel_id, f"Debug JSON:\n```{debug_json}```")
            else:
                # Fallback message if Blockvision returns no data
                combined_text = (
                    f"Contract Detected:\n{contract}\n\n"
                    f"Sent by: {username}\n\n"
                    f"Blockvision does not support this contract."
                )
                await client.send_message(target_channel_id, combined_text)
        except Exception as e:
            print(f"Error processing contract: {e}")
    else:
        print("No contract address detected in the message.")
    
    # Handle messages from RickBurpBot (if present)
    if sender.username == "RickBurpBot":
        for contract, data in list(pending_contracts.items()):
            if contract in message_text:
                print(f"Analysis found for contract: {contract}")
                combined_text = (
                    f"Contract Detected:\n{contract}\n\n"
                    f"Sent by: {data['sender']}\n\n"
                    f"Analysis by RickBurpBot:\n{message_text}\n"
                    f"Source: telegram\n"
                )
                await client.send_message(target_channel_id, combined_text)
                del pending_contracts[contract]
                break

async def main():
    print("Connecting to Telegram...")
    await client.connect()
    
    # Start the client using the bot token from .env
    await client.start(bot_token=bot_api_key)
    
    print("Bot is running. Waiting for messages...")
    await client.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
