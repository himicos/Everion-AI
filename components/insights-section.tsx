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

// --- Type Definitions ---

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
  type: "token_insight";
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
  source: "telegram" | "twitter";
}

type Insight = MarketInsight | TokenInsight;

type ActionButton = {
  label: string;
  action: "discuss" | "ape" | "analyse";
};

const actionButtons: ActionButton[] = [
  { label: "Discuss 💭", action: "discuss" },
  { label: "Ape 🚀", action: "ape" },
  { label: "Analyse 📊", action: "analyse" },
];

// --- Helpers ---

// Type guard for token insights.
function isTokenInsight(insight: Insight): insight is TokenInsight {
  return insight.type === "token_insight";
}

// Returns a unique identifier for an insight.
// For token insights, return the contract; for market insights, return the tweet_id.
function getInsightIdentifier(insight: Insight): string {
  return insight.type === "token_insight" ? insight.contract : insight.tweet_id;
}

// --- Component Implementation ---

export function InsightsSection() {
  const wallet = useWallet();
  const { messages, addMessage } = useChat();

  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionButton["action"] | "">("");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapAmount, setSwapAmount] = useState("1000000000"); // 1 SUI in minimal units
  const [sourceFilter, setSourceFilter] = useState<"all" | "telegram" | "twitter">("all");

  const formatSwapAmount = useCallback((amount: string): string => {
    return (parseInt(amount) / 1000000000).toString();
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("http://localhost:8000/insights", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setInsights(data);
        setError(null);
      } else if (data.message === "No insights available") {
        setInsights([]);
        setError("No insights available yet. Please check back later.");
      } else {
        throw new Error("Invalid data format received");
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      setError(error instanceof Error ? error.message : "Failed to load insights");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
    const intervalId = setInterval(fetchInsights, 30000);
    return () => clearInterval(intervalId);
  }, [fetchInsights]);

  const handleDelete = async () => {
    if (selectedForDeletion.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedForDeletion.map((id) =>
          fetch(`http://localhost:8000/insights/${id}`, { method: "DELETE" })
        )
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

  // Only token insights are selectable for chat/swap.
  const handleInsightClick = useCallback((insight: Insight) => {
    if (insight.type === "token_insight") {
      setSelectedInsight(insight);
      setInputValue(`Tell me more about ${insight.name} (${insight.symbol})`);
    }
  }, []);

  const handleActionClick = async (action: ActionButton["action"]) => {
    setSelectedAction(action);
    if (action === "ape" && selectedInsight) {
      if (!isTokenInsight(selectedInsight)) {
        addMessage("Swap is only available for token insights.", "ai");
        return;
      }
      if (!wallet.connected || !wallet.account?.address) {
        addMessage("Please connect your wallet to perform a swap.", "ai");
        return;
      }
      setIsSwapping(true);
      addMessage(`Preparing swap for ${selectedInsight.name} (${selectedInsight.symbol})...`, "ai");
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
          `Found best route!\n\nSwapping: ${formatSwapAmount(swapAmount)} SUI\nExpected output: ${quoteResponse.expectedAmountOut || "0"} ${selectedInsight.symbol}\nPrice Impact: ${(quoteResponse.priceImpact || 0).toFixed(4)}%`,
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
        addMessage(`❌ Swap failed: ${error instanceof Error ? error.message : "Unknown error"}`, "ai");
      } finally {
        setIsSwapping(false);
      }
    } else if (selectedInsight) {
      if (isTokenInsight(selectedInsight)) {
        setInputValue(
          `${action.charAt(0).toUpperCase() + action.slice(1)} ${selectedInsight.name} (${selectedInsight.contract})`
        );
      }
    }
  };

  const handleSendMessage = useCallback(() => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput) return;
    addMessage(trimmedInput, "user");
    const aiResponse = selectedAction
      ? `${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}ing ${selectedInsight?.name || ""}...\n\nIdentifier: ${
          selectedInsight && isTokenInsight(selectedInsight)
            ? selectedInsight.contract
            : selectedInsight?.tweet_id || ""
        }\nPrice: ${selectedInsight?.price || "N/A"}\nMarket Cap: ${selectedInsight?.market_cap || "N/A"}`
      : `Analyzing ${selectedInsight?.name || ""}...`;
    setTimeout(() => {
      addMessage(aiResponse, "ai");
    }, 1000);
    setInputValue("");
  }, [inputValue, selectedAction, selectedInsight, addMessage]);

  const formatTimestamp = useCallback((timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  }, []);

  const filteredInsights = useMemo(
    () =>
      insights.filter((insight) =>
        sourceFilter === "all" ? true : insight.source === sourceFilter
      ),
    [insights, sourceFilter]
  );

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      {/* Wallet Debug */}
      <div className="mb-4">
        <WalletDebug />
      </div>

      {/* Refresh and Delete Buttons */}
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

      {/* Source Filter Buttons */}
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

      {/* Insights Grid */}
      <div className="flex-1 space-y-6 mb-8">
        {isLoading && insights.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-lg text-gray-500">Loading insights...</div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 rounded-lg bg-red-100">{error}</div>
        ) : insights.length === 0 ? (
          <div className="text-gray-500 p-4 text-center">
            No insights available yet. New insights will appear here automatically.
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-gray-500 p-4 text-center">
            No insights available for the selected source.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInsights.map((insight) => {
              const id = getInsightIdentifier(insight);
              return (
                <Card
                  key={id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedInsight && getInsightIdentifier(selectedInsight) === id
                      ? "border-primary border-2"
                      : selectedForDeletion.includes(id)
                      ? "border-destructive border-2"
                      : ""
                  }`}
                  onClick={() => {
                    if (insight.type === "market_insight") {
                      // For market insights, open tweet link in a new tab.
                      window.open(insight.tweet_link, "_blank");
                    } else {
                      handleInsightClick(insight);
                    }
                  }}
                >
                  {insight.type === "market_insight" ? (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold flex-1">Market Insight 🔗</div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedForDeletion.includes(id)}
                            onCheckedChange={(checked) => {
                              setSelectedForDeletion((prev) =>
                                checked ? [...prev, id] : prev.filter((c) => c !== id)
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-2"
                          />
                        </div>
                      </div>
                      <div className="text-sm mb-2">{insight.text}</div>
                      <div className="text-xs text-gray-500">{insight.summary}</div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold flex-1">{insight.name}</div>
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
                            checked={selectedForDeletion.includes(id)}
                            onCheckedChange={(checked) => {
                              setSelectedForDeletion((prev) =>
                                checked ? [...prev, id] : prev.filter((c) => c !== id)
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="ml-2"
                          />
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mb-2">{insight.symbol}</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="font-medium">Price</div>
                          <div>{insight.price}</div>
                        </div>
                        <div>
                          <div className="font-medium">24h Change</div>
                          <div
                            className={(insight.price_change_24h || "").startsWith("-")
                              ? "text-red-500"
                              : "text-green-500"}
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
              );
            })}
          </div>
        )}
      </div>

      {/* Chat and Action Buttons */}
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
                  const minimalUnits = Math.max(0, Math.floor(parseFloat(value) * 1000000000)).toString();
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
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-grow"
            />
            <Button onClick={handleSendMessage} disabled={!inputValue.trim()} className="flex items-center justify-center">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
