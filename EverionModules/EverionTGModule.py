import re
import asyncio
import aiohttp
import json
from datetime import datetime
from urllib.parse import quote
from telethon import TelegramClient, events

# Telegram API credentials
api_id = "USER_FILLS_THIS"
api_hash = "USER_FILLS_THIS"
phone_number = "USER_FILLS_THIS"

# Configuration constants
INSIGHTS_FILE = "telegram_insights.json"
source_chat_ids = [
    -USER_FILLS_THIS,
    -USER_FILLS_THIS,
]
target_channel_id = -1002364915370
contract_regex = r"(0x[a-fA-F0-9]{64}::[a-zA-Z0-9_]+::[a-zA-Z0-9_]+)"

# API configurations
BLOCKVISION_API_URL = "https://api.blockvision.org/v2/sui/coin/detail"
BLOCKVISION_HOLDERS_API_URL = "https://api.blockvision.org/v2/sui/coin/holders"
BLOCKVISION_API_KEY = "USER_FILLS_THIS"

# Global dictionary to track contracts/bot responses
pending_contracts = {}

def format_number(number):
    """
    Format a number to use K for thousands and M for millions
    Example: 23000 -> 23K, 54000000 -> 54M
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
    Save contract insight to JSON file, appending to existing insights
    """
    try:
        # Load existing JSON file if available
        try:
            with open(INSIGHTS_FILE, "r") as f:
                insights = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            insights = []  # Create new list if file doesn't exist

        # Append new insight
        insights.append(insight)

        # Save updated JSON
        with open(INSIGHTS_FILE, "w") as f:
            json.dump(insights, f, indent=4)

    except Exception as e:
        print(f"Error saving insight: {e}")

client = TelegramClient("session_main", api_id, api_hash)

async def fetch_blockvision_data(coin_type):
    """Fetch coin data from Blockvision API"""
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
    """Fetch holder data from Blockvision API"""
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

@client.on(events.NewMessage(chats=source_chat_ids))
async def handler(event):
    sender = await event.get_sender()
    username = f"@{sender.username}" if sender.username else "Unknown"
    message_text = event.message.text or ""

    # Detect contract in new message
    match = re.search(contract_regex, message_text)
    if match:
        try:
            contract = match.group(1)
            print(f"Detected contract: {contract}")
            pending_contracts[contract] = {"message": event.message, "sender": username}

            # Fetch data from Blockvision API
            blockvision_data = await fetch_blockvision_data(contract)
            if blockvision_data:
                # Parse necessary information from Blockvision data
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

                # Create insight dictionary with source added.
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

                # Save to JSON
                save_insight_to_json(insight)

                # Create Telegram message (include source)
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

                # Send messages to Telegram
                await client.send_message(target_channel_id, combined_text)
                
                # Send JSON debug message
                debug_json = json.dumps(insight, indent=4)
                await client.send_message(target_channel_id, f"Debug JSON:\n```{debug_json}```")

            else:
                # Fallback for unsupported contracts
                combined_text = (
                    f"Contract Detected:\n{contract}\n\n"
                    f"Sent by: {username}\n\n"
                    f"Blockvision does not support this contract."
                )
                await client.send_message(target_channel_id, combined_text)

        except IndexError:
            print("Regex match failed. No valid contract address found in the message.")
    else:
        print("No contract address detected in the message.")

    # Handle RickBurpBot messages
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

    if not await client.is_user_authorized():
        print("Not logged in. Attempting login with code...")
        await client.start(phone=phone_number)
    else:
        await client.start()

    print("Bot is running. Waiting for messages...")
    await client.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
