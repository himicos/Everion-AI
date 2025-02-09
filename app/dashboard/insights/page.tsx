"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@suiet/wallet-kit"
import { Dashboard } from "@/components/dashboard"
import { InsightsSection } from "@/components/insights-section"

export default function InsightsPage() {
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
    <Dashboard hideChat={true}>
      <h1 className="mb-4 text-2xl font-bold text-foreground">Insights</h1>
      <InsightsSection />
    </Dashboard>
  )
}