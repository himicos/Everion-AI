"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@suiet/wallet-kit"
import { Dashboard } from "@/components/dashboard"

export default function SettingsPage() {
  const { connected } = useWallet()
  const router = useRouter()

  useEffect(() => {
    if (!connected) {
      router.push("/")
    }
  }, [connected, router])

  if (!connected) {
    return null
  }

  return (
    <Dashboard>
      <h1 className="mb-4 text-2xl font-bold text-foreground">Settings</h1>
      <p className="text-muted-foreground">Settings content will be integrated here.</p>
      {/* TODO: Add API integration for user settings */}
    </Dashboard>
  )
}

