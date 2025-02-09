"use client"

import { WalletProvider } from "@suiet/wallet-kit"
import "@suiet/wallet-kit/style.css"
import type React from "react" // Added import for React

export function WalletKitProvider({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>
}

