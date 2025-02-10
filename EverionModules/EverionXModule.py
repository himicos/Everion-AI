import os
import requests
from bs4 import BeautifulSoup
import re
import time
import json
import traceback
from datetime import datetime, timezone
from urllib.parse import quote

# Base configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MARKET_INSIGHTS_FILE = os.path.join(BASE_DIR, "market_insights.json")

# Blockvision API configurations
BLOCKVISION_API_URL = "https://api.blockvision.org/v2/sui/coin/detail"
BLOCKVISION_HOLDERS_API_URL = "https://api.blockvision.org/v2/sui/coin/holders"
BLOCKVISION_API_KEY = "USER_FILLS_THIS"

def format_number(number):
    """Format a number to use K for thousands and M for millions."""
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
    """Save market insight to JSON file, appending to existing insights."""
    try:
        # Load existing JSON file if available
        try:
            with open(MARKET_INSIGHTS_FILE, "r", encoding='utf-8') as f:
                insights = json.load(f)
                if not isinstance(insights, list):
                    insights = []
        except (FileNotFoundError, json.JSONDecodeError):
            insights = []  # Create new list if file doesn't exist

        # Check for duplicate tweet_id
        if insight.get('tweet_id'):
            exists = any(
                existing.get('tweet_id') == insight['tweet_id']
                for existing in insights
            )
            if exists:
                print(f"⚠️ Tweet {insight['tweet_id']} already exists, skipping")
                return

        # Insert new insight at the beginning
        insights.insert(0, insight)

        # Save updated JSON
        with open(MARKET_INSIGHTS_FILE, "w", encoding='utf-8') as f:
            json.dump(insights, f, indent=4, ensure_ascii=False)
            print(f"✅ Successfully saved insight to {MARKET_INSIGHTS_FILE}")
            print(f"Current insights count: {len(insights)}")

    except Exception as e:
        print(f"Error saving insight: {e}")
        traceback.print_exc()

def fetch_blockvision_data(coin_type):
    """Fetch coin data from Blockvision API synchronously."""
    encoded_coin_type = quote(coin_type, safe="")
    url = f"{BLOCKVISION_API_URL}?coinType={encoded_coin_type}"
    headers = {"accept": "application/json", "x-api-key": BLOCKVISION_API_KEY}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("Blockvision API Response:", data)
            return data.get("result", {})
        else:
            print(f"Failed to fetch data from Blockvision: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching Blockvision data: {e}")
        traceback.print_exc()
        return None

def fetch_blockvision_holders(coin_type, page_index=1, page_size=10):
    """Fetch holder data from Blockvision API synchronously."""
    encoded_coin_type = quote(coin_type, safe="")
    url = f"{BLOCKVISION_HOLDERS_API_URL}?coinType={encoded_coin_type}&pageIndex={page_index}&pageSize={page_size}"
    headers = {"accept": "application/json", "x-api-key": BLOCKVISION_API_KEY}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("Blockvision Holders API Response:", data)
            return data.get("result", {}).get("data", [])
        else:
            print(f"Failed to fetch holders data from Blockvision: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching Blockvision holders data: {e}")
        traceback.print_exc()
        return None

class NitterMonitor:
    def __init__(self):
        """Initialize the Nitter-based monitor."""
        self.base_url = "https://nitter.net"
        self.twitter_base_url = "https://x.com"
        self.contract_regex = r"(0x[a-fA-F0-9]{64}::[a-zA-Z0-9_]+::[a-zA-Z0-9_]+)"
        self.test_account = "163ba6y"
        self.last_tweet_id = None
        self.headers = {
            'User-Agent': (
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/120.0.0.0 Safari/537.36'
            ),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
        self.session = requests.Session()
        self._ensure_insights_file()

    def _ensure_insights_file(self):
        """Ensure the insights file exists and is valid JSON."""
        try:
            if not os.path.exists(MARKET_INSIGHTS_FILE):
                with open(MARKET_INSIGHTS_FILE, 'w', encoding='utf-8') as f:
                    json.dump([], f, indent=4)
                print(f"Created new insights file: {MARKET_INSIGHTS_FILE}")
            else:
                # Verify file is valid JSON
                with open(MARKET_INSIGHTS_FILE, 'r', encoding='utf-8') as f:
                    try:
                        data = json.load(f)
                        if not isinstance(data, list):
                            raise ValueError("File contains invalid data structure")
                    except json.JSONDecodeError:
                        print("Warning: Invalid JSON in insights file, resetting...")
                        with open(MARKET_INSIGHTS_FILE, 'w', encoding='utf-8') as f:
                            json.dump([], f, indent=4)
        except Exception as e:
            print(f"Error ensuring insights file: {e}")
            traceback.print_exc()

    def extract_contract_address(self, text: str) -> str:
        """Extract a Sui contract address from the text using regex."""
        match = re.search(self.contract_regex, text)
        return match.group(1) if match else None

    def check_new_tweets(self) -> dict:
        """Check for new tweets from the test account via Nitter."""
        url = f"{self.base_url}/{self.test_account}"
        try:
            print(f"\nChecking tweets at: {url}")
            response = self.session.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            tweets = soup.find_all('div', class_='timeline-item')
            if not tweets:
                print("No tweets found")
                return None

            tweet = None
            for t in tweets:
                if not t.find('div', class_='pinned'):
                    tweet = t
                    break

            if tweet is None:
                print("No non-pinned tweets found")
                return None

            content = tweet.find('div', class_='tweet-content')
            if not content:
                print("No tweet content found")
                return None

            tweet_text = content.get_text(strip=True)
            permalink_tag = tweet.find('a', class_='tweet-link')
            if not permalink_tag or not permalink_tag.get('href'):
                print("No tweet link found")
                return None

            tweet_link_fragment = permalink_tag['href']
            tweet_id = tweet_link_fragment.split('/')[-1]

            if tweet_id == self.last_tweet_id:
                return None
            self.last_tweet_id = tweet_id

            tweet_time = datetime.now(timezone.utc).isoformat()
            timestamp_tag = tweet.find('span', class_='tweet-date')
            if timestamp_tag and timestamp_tag.find('a'):
                tweet_time = timestamp_tag.find('a').get('title', tweet_time)

            complete_tweet_link = f"{self.twitter_base_url}/{self.test_account}/status/{tweet_id}"

            return {
                'tweet_id': tweet_id,
                'text': tweet_text,
                'created_at': tweet_time,
                'tweet_link': complete_tweet_link,
                'contract_address': self.extract_contract_address(tweet_text)
            }

        except requests.exceptions.RequestException as e:
            print(f"Request error: {e}")
            traceback.print_exc()
            return None
        except Exception as e:
            print(f"Error processing tweets: {e}")
            traceback.print_exc()
            return None

    def process_contract_tweet(self, tweet_data: dict) -> dict:
        """Process tweets that contain a contract address."""
        contract = tweet_data['contract_address']
        blockvision_data = fetch_blockvision_data(contract)
        
        if blockvision_data:
            name = blockvision_data.get("name", "N/A")
            symbol = blockvision_data.get("symbol", "N/A")
            price = blockvision_data.get("price", "N/A")
            price_change_24h = blockvision_data.get("priceChangePercentage24H", "N/A")
            total_supply = format_number(blockvision_data.get("totalSupply", "N/A"))
            holders = format_number(blockvision_data.get("holders", "N/A"))
            market_cap = format_number(blockvision_data.get("marketCap", "N/A"))
            is_verified = blockvision_data.get("verified", False)
            scam_flag = "None" if blockvision_data.get("scamFlag", 0) == 0 else "Scam Detected"

            holders_data = fetch_blockvision_holders(contract)
            if holders_data:
                try:
                    top_10_holders_percentage = sum(float(holder.get("percentage", 0)) for holder in holders_data)
                    top_10_holders_percentage = round(top_10_holders_percentage * 100, 2)
                except Exception as e:
                    print(f"Error calculating top 10 holders percentage: {e}")
                    top_10_holders_percentage = "N/A"
            else:
                top_10_holders_percentage = "N/A"

            insight = {
                "type": "token_insight",
                "contract": contract,
                "sender": f"@{self.test_account}",
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
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "tweet_id": tweet_data['tweet_id'],
                "tweet_link": tweet_data['tweet_link'],
                "text": tweet_data['text'],
                "created_at": tweet_data['created_at'],
                "source": "twitter"
            }
        else:
            insight = {
                "type": "token_insight",
                "contract": contract,
                "sender": f"@{self.test_account}",
                "name": "Unknown",
                "symbol": "Unknown",
                "price": "N/A",
                "price_change_24h": "N/A",
                "total_supply": "N/A",
                "holders": "N/A",
                "market_cap": "N/A",
                "top_10_holders_percentage": "N/A",
                "verified": False,
                "scam_flag": "N/A",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "tweet_id": tweet_data['tweet_id'],
                "tweet_link": tweet_data['tweet_link'],
                "text": tweet_data['text'],
                "created_at": tweet_data['created_at'],
                "source": "twitter"
            }
        return insight

    def process_non_contract_tweet(self, tweet_data: dict) -> dict:
        """Process tweets that do not contain a contract address."""
        summary = f"@{self.test_account}: {tweet_data['text']} 🔗"
        insight = {
            "type": "market_insight",
            "tweet_id": tweet_data['tweet_id'],
            "text": tweet_data['text'],
            "created_at": tweet_data['created_at'],
            "summary": summary,
            "tweet_link": tweet_data['tweet_link'],
            "source": "twitter",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        return insight

    def monitor(self, check_interval: int = 30, duration: int = 300) -> None:
        """Monitor tweets with improved error handling and file management."""
        print(f"\nStarting Nitter monitor for @{self.test_account}")
        print(f"Will check every {check_interval} seconds for {duration} seconds")
        print("Waiting for new tweets...")
        print("-" * 50)
        
        start_time = time.time()
        last_check_time = 0
        
        try:
            while time.time() - start_time < duration:
                current_time = time.time()
                
                # Ensure minimum interval between checks
                if current_time - last_check_time < check_interval:
                    time.sleep(1)
                    continue
                    
                tweet_data = self.check_new_tweets()
                last_check_time = current_time
                
                if tweet_data:
                    print("\n🔥 New tweet detected!")
                    print(f"Time: {tweet_data['created_at']}")
                    print(f"Text: {tweet_data['text']}")
                    
                    try:
                        if tweet_data['contract_address']:
                            print(f"✨ Contract found: {tweet_data['contract_address']}")
                            insight = self.process_contract_tweet(tweet_data)
                        else:
                            print("ℹ️ No contract address found - processing as market insight")
                            insight = self.process_non_contract_tweet(tweet_data)
                            
                        if insight:
                            save_insight_to_json(insight)
                            print("\nProcessed Insight:")
                            for key, value in insight.items():
                                print(f"{key}: {value}")
                        else:
                            print("⚠️ Failed to create insight from tweet")
                            
                    except Exception as e:
                        print(f"Error processing tweet: {e}")
                        traceback.print_exc()
                        continue
                        
                    print("-" * 50)
                    
                remaining_time = duration - (time.time() - start_time)
                if remaining_time > 0:
                    sleep_time = min(check_interval, remaining_time)
                    print(f"Next check in {sleep_time:.0f} seconds...")
                    time.sleep(sleep_time)
                    
            print("\nMonitoring session completed successfully")
            
        except KeyboardInterrupt:
            print("\nMonitoring stopped by user")
        except Exception as e:
            print(f"\nError during monitoring: {e}")
            traceback.print_exc()
        finally:
            print("\nMonitoring session ended")


if __name__ == "__main__":
    monitor = NitterMonitor()
    monitor.monitor(check_interval=30, duration=300)