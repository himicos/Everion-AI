"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@suiet/wallet-kit";
import { Dashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";

export default function SettingsPage() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  if (!connected) {
    return null;
  }

  // State for settings values
  const [telegramBotApi, setTelegramBotApi] = useState("");
  const [xAccounts, setXAccounts] = useState("");
  const [telegramChats, setTelegramChats] = useState("");
  const [blockvisionApiKey, setBlockvisionApiKey] = useState("");

  // State for toggling help pop-ups
  const [showTelegramBotHelp, setShowTelegramBotHelp] = useState(false);
  const [showXAccountsHelp, setShowXAccountsHelp] = useState(false);
  const [showTelegramChatsHelp, setShowTelegramChatsHelp] = useState(false);
  const [showBlockvisionHelp, setShowBlockvisionHelp] = useState(false);

  return (
    <Dashboard hideChat={true}>
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold text-foreground">Settings</h1>
        <div className="space-y-8 max-w-xl">
          {/* Telegram Bot API Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="font-medium text-foreground">Telegram Bot API</label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTelegramBotHelp(!showTelegramBotHelp)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            {showTelegramBotHelp && (
              <div className="rounded bg-gray-100 p-2 text-xs text-gray-600">
                Enter your Telegram Bot API key (e.g., 123456:ABCdefGHIjklMNOpqrSTUV).
              </div>
            )}
            <Input
              value={telegramBotApi}
              onChange={(e) => setTelegramBotApi(e.target.value)}
              placeholder="Enter Telegram Bot API key"
            />
          </div>

          {/* X Accounts to Track Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="font-medium text-foreground">
                X accounts to track (up to 5)
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowXAccountsHelp(!showXAccountsHelp)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            {showXAccountsHelp && (
              <div className="rounded bg-gray-100 p-2 text-xs text-gray-600">
                Enter Twitter accounts in the format: EmanAbio, WalrusProtocol, SuiNetwork, 163ba6y.
              </div>
            )}
            <Input
              value={xAccounts}
              onChange={(e) => setXAccounts(e.target.value)}
              placeholder="Enter Twitter accounts, comma separated"
            />
          </div>

          {/* Telegram Chats to Track Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="font-medium text-foreground">
                Telegram chats to track (up to 3)
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTelegramChatsHelp(!showTelegramChatsHelp)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            {showTelegramChatsHelp && (
              <div className="rounded bg-gray-100 p-2 text-xs text-gray-600">
                Open the desired chat on web.telegram.org to get the ChatID (e.g., -238474575).
              </div>
            )}
            <Input
              value={telegramChats}
              onChange={(e) => setTelegramChats(e.target.value)}
              placeholder="Enter Telegram ChatIDs, comma separated"
            />
          </div>

          {/* Blockvision API Key Field */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <label className="font-medium text-foreground">Blockvision API key</label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBlockvisionHelp(!showBlockvisionHelp)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            {showBlockvisionHelp && (
              <div className="rounded bg-gray-100 p-2 text-xs text-gray-600">
                Enter your Blockvision API key.
              </div>
            )}
            <Input
              value={blockvisionApiKey}
              onChange={(e) => setBlockvisionApiKey(e.target.value)}
              placeholder="Enter Blockvision API key"
            />
          </div>
        </div>
      </div>
    </Dashboard>
  );
}
