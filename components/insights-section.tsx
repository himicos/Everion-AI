"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader, RefreshCw, Trash2 } from "lucide-react";
import { useChat } from "@/contexts/chat-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import WalletDebug from "@/components/ui/WalletDebug";
import { useWallet } from "@suiet/wallet-kit"; // Import useWallet
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { setSuiClient, getQuote, buildTx } from "@7kprotocol/sdk-ts";

// Initialize Sui Client for 7K Protocol
const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });
setSuiClient(suiClient);

interface Insight {
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
}

const actionButtons = [
  { label: "Discuss 💭", action: "discuss" },
  { label: "Ape 🚀", action: "ape" },
  { label: "Analyse 📊", action: "analyse" },
];

export function InsightsSection() {
  // Wallet integration
  const wallet = useWallet(); // Use the wallet object directly
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedForDeletion, setSelectedForDeletion] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false); // Swap loading state
  const [swapAmount, setSwapAmount] = useState("1000000000"); // 1 SUI in minimal units
  const { messages, addMessage } = useChat();

  // Utility to format swap amount from minimal units to SUI
  const formatSwapAmount = (amount: string) => {
    return (parseInt(amount) / 1000000000).toString();
  };

  // Fetch insights from the backend
  const fetchInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("http://localhost:8000/insights", {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received data:", data);
      
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

  // Fetch insights on component mount and set up a refresh interval
  useEffect(() => {
    fetchInsights();
    const intervalId = setInterval(fetchInsights, 30000);
    return () => clearInterval(intervalId);
  }, [fetchInsights]);

  // Handle refresh button click
  const handleRefresh = async () => {
    await fetchInsights();
  };

  // Handle delete button click
  const handleDelete = async () => {
    if (selectedForDeletion.length === 0) return;
    
    setIsDeleting(true);
    try {
      // Delete each selected insight
      await Promise.all(
        selectedForDeletion.map(contract =>
          fetch(`http://localhost:8000/insights/${contract}`, {
            method: 'DELETE',
          })
        )
      );
      
      // Refresh insights after deletion
      await fetchInsights();
      setSelectedForDeletion([]);
    } catch (error) {
      console.error("Error deleting insights:", error);
      setError("Failed to delete insights");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle insight card click
  const handleInsightClick = (insight: Insight) => {
    setSelectedInsight(insight);
    setInputValue(`Tell me more about ${insight.name} (${insight.symbol})`);
  };

  // Handle action button click (e.g., "Ape 🚀")
  const handleActionClick = async (action: string) => {
    setSelectedAction(action);
  
    if (action === "ape" && selectedInsight) {
      if (!wallet.connected || !wallet.account?.address) {
        addMessage("Please connect your wallet to perform a swap.", "ai");
        return;
      }
  
      setIsSwapping(true);
      addMessage(`Preparing swap for ${selectedInsight.name} (${selectedInsight.symbol})...`, "ai");
  
      try {
        // Step 1: Fetch Quote
        const quoteResponse = await getQuote({
          tokenIn: "0x2::sui::SUI", // Swap from SUI
          tokenOut: selectedInsight.contract, // Swap to selected token
          amountIn: swapAmount, // Use the swap amount state
        });
  
        // Log quote details
        addMessage(
          `Found best route!\n\n` +
          `Swapping: ${formatSwapAmount(swapAmount)} SUI\n` +
          `Expected output: ${quoteResponse.expectedAmountOut || '0'} ${selectedInsight.symbol}\n` +
          `Price Impact: ${(quoteResponse.priceImpact || 0).toFixed(4)}%`,
          "ai"
        );
  
        // Step 2: Build Transaction
        const result = await buildTx({
          quoteResponse,
          accountAddress: wallet.account.address,
          slippage: 0.01, // 1% slippage
          commission: {
            partner: wallet.account.address,
            commissionBps: 0, // No commission
          },
        });
  
        if (!result || !result.tx) {
          throw new Error('Failed to build transaction');
        }
  
        // Step 3: Execute Transaction
        const response = await wallet.signAndExecuteTransactionBlock({
          transactionBlock: result.tx,
        });
  
        addMessage(
          `✅ Swap successful!\n\n` +
          `Token: ${selectedInsight.symbol}\n` +
          `Amount: ${formatSwapAmount(swapAmount)} SUI\n` +
          `Tx: ${response.digest}`,
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
    } else if (selectedInsight) {
      setInputValue(
        `${action.charAt(0).toUpperCase() + action.slice(1)} ${selectedInsight.name} (${selectedInsight.contract})`
      );
    }
  };

  // Handle sending a chat message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    addMessage(inputValue, "user");

    const aiResponse = selectedAction
      ? `${selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}ing ${
          selectedInsight?.name || ""
        }...\n\nContract: ${selectedInsight?.contract}\nPrice: ${
          selectedInsight?.price
        }\nMarket Cap: ${selectedInsight?.market_cap}`
      : `Analyzing ${selectedInsight?.name || ""}...`;

    setTimeout(() => {
      addMessage(aiResponse, "ai");
    }, 1000);

    setInputValue("");
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

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
            onClick={handleRefresh}
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight) => (
              <Card
                key={insight.contract}
                className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                  selectedInsight?.contract === insight.contract
                    ? "border-primary border-2"
                    : selectedForDeletion.includes(insight.contract)
                    ? "border-destructive border-2"
                    : ""
                }`}
                onClick={() => handleInsightClick(insight)}
              >
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
                      checked={selectedForDeletion.includes(insight.contract)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedForDeletion(prev => [...prev, insight.contract]);
                        } else {
                          setSelectedForDeletion(prev => prev.filter(c => c !== insight.contract));
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2"
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {insight.symbol}
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
                        insight.price_change_24h.startsWith("-")
                          ? "text-red-500"
                          : "text-green-500"
                      }
                    >
                      {insight.price_change_24h}
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
                <div className="text-xs text-gray-400 mt-2">
                  {formatTimestamp(insight.timestamp)}
                </div>
              </Card>
            ))}
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
                  const minimalUnits = (parseFloat(e.target.value) * 1000000000).toString();
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
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-grow"
            />
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}