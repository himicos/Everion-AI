"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface WalletConnectProps {
  onConnect: () => void
}

export function WalletConnect({ onConnect }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectWallet = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      // TODO: Implement actual wallet connection logic here
      // This could involve calling a function from a wallet library
      // For now, we'll simulate a connection with a timeout
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // If connection is successful, call the onConnect callback
      onConnect()
    } catch (err) {
      setError("Failed to connect wallet. Please try again.")
      console.error(err)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="text-center">
      <Button onClick={connectWallet} disabled={isConnecting} className="px-6 py-3 text-lg">
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
      {error && <p className="mt-4 text-red-500">{error}</p>}
    </div>
  )
}

