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
  const [telegramApiId, setTelegramApiId] = useState("");
  const [telegramApiHash, setTelegramApiHash] = useState("");
  // Pre-filled Bot API Key
  const [botApiKey, setBotApiKey] = useState("7939756814:AAHsnsRl2J8xArPv6Kl2B2gBPUzU99OFsxI");
  const [blockvisionApiKey, setBlockvisionApiKey] = useState("");
  const [xAccounts, setXAccounts] = useState("");

  // State for toggling help pop-ups
  const [showTelegramApiIdHelp, setShowTelegramApiIdHelp] = useState(false);
  const [showTelegramApiHashHelp, setShowTelegramApiHashHelp] = useState(false);
  const [showBotApiKeyHelp, setShowBotApiKeyHelp] = useState(false);
  const [showBlockvisionHelp, setShowBlockvisionHelp] = useState(false);
  const [showXAccountsHelp, setShowXAccountsHelp] = useState(false);

  // State for submission feedback
  const [submitMessage, setSubmitMessage] = useState("");

  const handleSubmit = async () => {
    const payload = {
      telegram_api_id: telegramApiId,
      telegram_api_hash: telegramApiHash,
      bot_api_key: botApiKey,
      blockvision_api_key: blockvisionApiKey,
      x_accounts: xAccounts,
    };

    try {
      const res = await fetch("/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitMessage("Settings updated successfully!");
      } else {
        const errorData = await res.json();
        setSubmitMessage(`Error: ${errorData.detail || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitMessage("Error updating settings.");
    }
  };

  return (
    <Dashboard hideChat={true}>
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold text-foreground">Settings</h1>
        <div className="space-y-8 max-w-xl">
          {/* Section: Telegram Credentials */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">Telegram Credentials</h2>
            
            {/* Telegram API ID */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <label className="font-medium text-foreground">Telegram API ID</label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTelegramApiIdHelp(!showTelegramApiIdHelp)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
              {showTelegramApiIdHelp && (
                <div className="rounded bg-gray-100 p-2 text-xs text-gray-600">
                  Get your Telegram API ID from{" "}
                  <a
                    href="https://my.telegram.org/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-blue-600"
                  >
                    https://my.telegram.org/apps
                  </a>.
                </div>
              )}
              <Input
                value={telegramApiId}
                onChange={(e) => setTelegramApiId(e.target.value)}
                placeholder="Enter Telegram API ID"
              />
            </div>

            {/* Telegram API Hash */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <label className="font-medium text-foreground">Telegram API Hash</label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTelegramApiHashHelp(!showTelegramApiHashHelp)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
              {showTelegramApiHashHelp && (
                <div className="rounded bg-gray-100 p-2 text-xs text-gray-600">
                  Get your Telegram API Hash from{" "}
                  <a
                    href="https://my.telegram.org/apps"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-blue-600"
                  >
                    https://my.telegram.org/apps
                  </a>.
                </div>
              )}
              <Input
                value={telegramApiHash}
                onChange={(e) => setTelegramApiHash(e.target.value)}
                placeholder="Enter Telegram API Hash"
              />
            </div>

            {/* Bot API Key */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <label className="font-medium text-foreground">Bot API Key</label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBotApiKeyHelp(!showBotApiKeyHelp)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
              {showBotApiKeyHelp && (
                <div className="rounded bg-gray-100 p-2 text-xs text-gray-600">
                  Enter your Bot API Key (provided by BotFather).
                </div>
              )}
              <Input
                value={botApiKey}
                onChange={(e) => setBotApiKey(e.target.value)}
                placeholder="Enter Bot API Key"
              />
            </div>
          </div>

          {/* Section: Tracking & Blockvision */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">Tracking & Blockvision</h2>
            
            {/* Blockvision API Key */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <label className="font-medium text-foreground">Blockvision API Key</label>
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
                placeholder="Enter Blockvision API Key"
              />
            </div>

            {/* X Accounts to Track */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <label className="font-medium text-foreground">
                  X Accounts to Track (up to 5)
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
          </div>

          {/* Submit Button Section */}
          <div className="flex flex-col items-center">
            <Button
              onClick={handleSubmit}
              variant="primary"
              className="w-48 bg-green-200 hover:bg-green-300 text-green-800 rounded-full py-2 px-6"
            >
              Submit Settings
            </Button>
            {submitMessage && (
              <p className="mt-2 text-sm text-foreground">{submitMessage}</p>
            )}
          </div>
        </div>
      </div>
    </Dashboard>
  );
}
