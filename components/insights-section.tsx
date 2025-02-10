"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader, RefreshCw, Trash2 } from "lucide-react";
import { useChat } from "@/contexts/chat-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import WalletDebug from "@/components/ui/WalletDebug";
import { useWallet } from "@suiet/wallet-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { setSuiClient, getQuote, buildTx } from "@7kprotocol/sdk-ts";

// Initialize Sui Client for 7K Protocol
const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
setSuiClient(suiClient);

interface MarketInsight {
  type: "market_insight";
  tweet_id: string;
  text: string;
  created_at: string;
  summary: string;
  tweet_link: string;
  source: "twitter";
  timestamp: string;
}

interface TokenInsight {
  type?: "token_insight";
  contract: string;
  sender: string;
  name: string;
  symbol: string;
  price: string;
  price_change_24h: string;
  total_supply: string;
  holders: string;
  market_cap: string;
  top_10_holders_percentage: string;
  verified: boolean;
  scam_flag: string;
  timestamp: string;
  source: "telegram";
}

export type Insight = TokenInsight | MarketInsight;

// Extend Insight with a property to track how many fetch cycles it has been missing
interface InsightWithGrace extends Insight {
  missingCount: number;
}

type ActionButton = {
  label: string;
  action: "discuss" | "ape" | "analyse";
};

const actionButtons: ActionButton[] = [
  { label: "Discuss 💭", action: "discuss" },
  { label: "Ape 🚀", action: "ape" },
  { label: "Analyse 📊", action: "analyse" },
];

// API Configuration
const API_CONFIG = {
  BASE_URL: "https://everion-fastapi.fly.dev",
  ENDPOINTS: {
    INSIGHTS: "/insights",
    MESSAGE: "http://localhost:3001/44be3a29-323b-0289-9bdd-de0b009180b1/message",
  },
  REFRESH_INTERVAL: 30000, // Adjust as needed
  HEADERS: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

// API Service Layer
class InsightsAPI {
  static async fetchInsights() {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INSIGHTS}`,
        {
          method: "GET",
          headers: API_CONFIG.HEADERS,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // We expect either an array of insights or a message indicating no insights.
      if (!Array.isArray(data) && data.message !== "No insights available") {
        throw new Error("Invalid response format");
      }

      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  static async deleteInsight(id: string) {
    try {
      // Encode the id to handle special characters correctly
      const encodedId = encodeURIComponent(id);
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INSIGHTS}/${encodedId}`,
        {
          method: "DELETE",
          headers: API_CONFIG.HEADERS,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete insight: ${id}`);
      }

      return true;
    } catch (error) {
      console.error("Delete Error:", error);
      throw error;
    }
  }

  /**
   * Send a message to the chat endpoint.
   * The "file" parameter now contains the full JSON context (as a string) from the insights endpoint.
   */
  static async sendMessage(
    text: string,
    userName?: string,
    userId?: string,
    file?: string
  ) {
    try {
      const response = await fetch(API_CONFIG.ENDPOINTS.MESSAGE, {
        method: "POST",
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify({ text, userName, userId, file }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();
      return data; // Expect data to be an array of messages.
    } catch (error) {
      console.error("Send Message Error:", error);
      throw error;
    }
  }
}

export function InsightsSection() {
  const wallet = useWallet();
  const { messages, addMessage } = useChat();

  // Chat and insights state
  const [cachedInsights, setCachedInsights] = useState<InsightWithGrace[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionButton["action"] | "">("");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapAmount, setSwapAmount] = useState("1000000000"); // SUI minimal units (1e9)
  const [sourceFilter, setSourceFilter] = useState<"all" | "telegram" | "twitter">("all");

  // Helper: Return a unique identifier for an insight.
  const getInsightId = useCallback((insight: Insight) => {
    return insight.type === "market_insight" ? insight.tweet_id : insight.contract;
  }, []);

  // Helper: Merge new insights with cached state.
  const mergeInsights = useCallback(
    (cached: InsightWithGrace[], fresh: Insight[]): InsightWithGrace[] => {
      const threshold = 2; // Remove if missing for more than 2 cycles.
      const freshMap = new Map<string, Insight>();
      fresh.forEach((item) => freshMap.set(getInsightId(item), item));

      const updated: InsightWithGrace[] = [];

      cached.forEach((item) => {
        const id = getInsightId(item);
        if (freshMap.has(id)) {
          updated.push({ ...freshMap.get(id)!, missingCount: 0 });
          freshMap.delete(id);
        } else {
          const newMissing = item.missingCount + 1;
          if (newMissing <= threshold) {
            updated.push({ ...item, missingCount: newMissing });
          }
        }
      });

      freshMap.forEach((insight) => {
        updated.push({ ...insight, missingCount: 0 });
      });

      return updated;
    },
    [getInsightId]
  );

  // Formatting helpers
  const formatSwapAmount = useCallback((amount: string): string => {
    return (parseInt(amount) / 1e9).toString();
  }, []);

  const formatTokenAmount = useCallback(
    (amount: string, decimals: number = 9): string => {
      const value = parseInt(amount) / Math.pow(10, decimals);
      return value.toFixed(4);
    },
    []
  );

  // Fetch insights periodically.
  const fetchInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await InsightsAPI.fetchInsights();
      let freshInsights: Insight[] = [];
      if (Array.isArray(data)) {
        freshInsights = data;
        setError(null);
      } else if (data.message === "No insights available") {
        freshInsights = [];
        setError("No insights available yet. Please check back later.");
      } else {
        throw new Error("Invalid data format received");
      }
      setCachedInsights((prev) => mergeInsights(prev, freshInsights));
    } catch (error) {
      console.error("Error fetching insights:", error);
      setError(error instanceof Error ? error.message : "Failed to load insights");
    } finally {
      setIsLoading(false);
    }
  }, [mergeInsights]);

  useEffect(() => {
    fetchInsights();
    const intervalId = setInterval(fetchInsights, API_CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(intervalId);
  }, [fetchInsights]);

  const handleDelete = async () => {
    if (selectedForDeletion.length === 0) return;

    setIsDeleting(true);
    try {
      setCachedInsights((prev) =>
        prev.filter((insight) => !selectedForDeletion.includes(getInsightId(insight)))
      );

      await Promise.all(
        selectedForDeletion.map((id) => InsightsAPI.deleteInsight(id))
      );
      await fetchInsights();
      setSelectedForDeletion([]);
    } catch (error) {
      console.error("Error deleting insights:", error);
      setError("Failed to delete insights");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInsightClick = useCallback((insight: Insight) => {
    if (insight.type === "market_insight") {
      window.open(insight.tweet_link, "_blank");
    } else {
      setSelectedInsight(insight);
      setInputValue(`Tell me more about ${insight.name} (${insight.symbol})`);
    }
  }, []);

  const handleActionClick = async (action: ActionButton["action"]) => {
    setSelectedAction(action);

    if (!selectedInsight || selectedInsight.type === "market_insight") return;

    if (action === "ape") {
      if (!wallet.connected || !wallet.account?.address) {
        addMessage("Please connect your wallet to perform a swap.", "ai");
        return;
      }

      setIsSwapping(true);
      addMessage(
        `Preparing swap for ${selectedInsight.name} (${selectedInsight.symbol})...`,
        "ai"
      );

      try {
        const quoteResponse = await getQuote({
          tokenIn: "0x2::sui::SUI",
          tokenOut: selectedInsight.contract,
          amountIn: swapAmount,
        });

        if (!quoteResponse) {
          throw new Error("Failed to get quote");
        }

        addMessage(
          `Found best route!\n\nSwapping: ${formatSwapAmount(swapAmount)} SUI\nPrice Impact: ${(quoteResponse.priceImpact || 0).toFixed(4)}%`,
          "ai"
        );

        const result = await buildTx({
          quoteResponse,
          accountAddress: wallet.account.address,
          slippage: 0.01,
          commission: {
            partner: wallet.account.address,
            commissionBps: 0,
          },
        });

        if (!result?.tx) {
          throw new Error("Failed to build transaction");
        }

        const response = await wallet.signAndExecuteTransactionBlock({
          transactionBlock: result.tx,
        });

        addMessage(
          `✅ Swap successful!\n\nToken: ${selectedInsight.symbol}\nAmount: ${formatSwapAmount(swapAmount)} SUI\nTx: ${response.digest}`,
          "ai"
        );
      } catch (error) {
        console.error("Swap failed:", error);
        addMessage(
          `❌ Swap failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          "ai"
        );
      } finally {
        setIsSwapping(false);
      }
    } else {
      setInputValue(
        `${action.charAt(0).toUpperCase() + action.slice(1)} ${selectedInsight.name} (${selectedInsight.contract})`
      );
    }
  };

  // Chat functionality: send message via API endpoint and process response.
  // When the selected action is either "analyse" or "discuss", we pass the full JSON
  // (stringified) from the selected insight as the "file" parameter so that ElizaOS receives full context.
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;

    // Add user's message to the chat.
    addMessage(trimmedInput, "user");

    // Display a placeholder message while waiting for the API response.
    addMessage("Loading response...", "ai");

    let fileContext: string | undefined;
    if ((selectedAction === "analyse" || selectedAction === "discuss") && selectedInsight) {
      // Reveal the full JSON from the insights API as context.
      fileContext = JSON.stringify(selectedInsight, null, 2);
    }

    try {
      const response = await InsightsAPI.sendMessage(
        trimmedInput,
        undefined,
        undefined,
        fileContext
      );
      // Expecting response to be an array of messages.
      response.forEach((msg: { user: string; text: string; action: string }) => {
        addMessage(msg.text, msg.user === "Everion" ? "ai" : "user");
      });
    } catch (error) {
      console.error("Error sending message:", error);
      addMessage("Failed to send message. Please try again.", "ai");
    }

    setInputValue("");
  }, [inputValue, addMessage, selectedAction, selectedInsight]);

  const formatTimestamp = useCallback((timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  }, []);

  // Filter cached insights by source for display purposes.
  const filteredInsights = useMemo(
    () =>
      cachedInsights.filter((insight) =>
        sourceFilter === "all" ? true : insight.source === sourceFilter
      ),
    [cachedInsights, sourceFilter]
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="mb-4">
        <WalletDebug />
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsights}
            disabled={isLoading || isDeleting}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? "Refreshing..." : "Refresh"}
          </Button>

          {selectedForDeletion.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isDeleting ? "Deleting..." : `Delete (${selectedForDeletion.length})`}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={sourceFilter === "all" ? "primary" : "outline"}
          onClick={() => setSourceFilter("all")}
        >
          All
        </Button>
        <Button
          variant={sourceFilter === "telegram" ? "primary" : "outline"}
          onClick={() => setSourceFilter("telegram")}
        >
          Telegram
        </Button>
        <Button
          variant={sourceFilter === "twitter" ? "primary" : "outline"}
          onClick={() => setSourceFilter("twitter")}
        >
          Market
        </Button>
      </div>

      <div className="flex-1 space-y-6 mb-8">
        {isLoading && cachedInsights.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-lg text-gray-500">Loading insights...</div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 rounded-lg bg-red-100">{error}</div>
        ) : cachedInsights.length === 0 ? (
          <div className="text-gray-500 p-4 text-center">
            No insights available yet. New insights will appear here automatically.
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-gray-500 p-4 text-center">
            No insights available for the selected source.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInsights.map((insight) => (
              <Card
                key={getInsightId(insight)}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedInsight === insight
                    ? "border-primary border-2"
                    : selectedForDeletion.includes(getInsightId(insight))
                    ? "border-destructive border-2"
                    : ""
                }`}
                onClick={() => handleInsightClick(insight)}
              >
                {insight.type === "market_insight" ? (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold flex-1">Market Insight 🔗</div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedForDeletion.includes(insight.tweet_id)}
                          onCheckedChange={(checked) => {
                            setSelectedForDeletion((prev) =>
                              checked
                                ? [...prev, insight.tweet_id]
                                : prev.filter((id) => id !== insight.tweet_id)
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-2"
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">{insight.summary}</div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold flex-1">
                        {insight.name} ({insight.symbol})
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-sm px-2 py-1 rounded ${
                            insight.scam_flag === "None"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {insight.verified ? "✓ Verified" : "Unverified"}
                        </div>
                        <Checkbox
                          checked={selectedForDeletion.includes(insight.contract)}
                          onCheckedChange={(checked) => {
                            setSelectedForDeletion((prev) =>
                              checked
                                ? [...prev, insight.contract]
                                : prev.filter((id) => id !== insight.contract)
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="ml-2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="font-medium">Price</div>
                        <div>{insight.price}</div>
                      </div>
                      <div>
                        <div className="font-medium">24h Change</div>
                        <div
                          className={
                            insight.price_change_24h?.startsWith("-")
                              ? "text-red-500"
                              : "text-green-500"
                          }
                        >
                          {insight.price_change_24h || "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">Market Cap</div>
                        <div>{insight.market_cap}</div>
                      </div>
                      <div>
                        <div className="font-medium">Holders</div>
                        <div>{insight.holders}</div>
                      </div>
                    </div>
                  </>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  {formatTimestamp(insight.timestamp)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div className="mt-auto">
        <ScrollArea className="h-[200px] mb-4 rounded-lg border bg-muted/50 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-2 rounded-lg p-3 ${
                message.sender === "user"
                  ? "ml-auto max-w-[80%] bg-primary text-primary-foreground"
                  : "mr-auto max-w-[80%] bg-secondary text-secondary-foreground"
              }`}
            >
              {message.text}
            </div>
          ))}
        </ScrollArea>

        <div className="space-y-4">
          <div className="flex space-x-2">
            {selectedAction === "ape" && (
              <Input
                type="number"
                value={formatSwapAmount(swapAmount)}
                onChange={(e) => {
                  const value = e.target.value;
                  const minimalUnits = Math.max(
                    0,
                    Math.floor(parseFloat(value) * 1e9)
                  ).toString();
                  setSwapAmount(minimalUnits);
                }}
                placeholder="Amount in SUI"
                className="w-32"
              />
            )}
            {actionButtons.map(({ label, action }) => (
              <Button
                key={action}
                variant="outline"
                className={`rounded-full ${
                  selectedAction === action
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground"
                }`}
                onClick={() => handleActionClick(action)}
                disabled={action === "ape" && (!wallet.connected || isSwapping)}
              >
                {isSwapping && action === "ape" ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Swapping...
                  </>
                ) : (
                  label
                )}
              </Button>
            ))}
          </div>
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-grow"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
