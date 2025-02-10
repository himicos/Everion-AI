"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@suiet/wallet-kit"
import { Dashboard } from "@/components/dashboard"
import { MainContent } from "@/components/main-content"

export default function DashboardPage() {
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
      <div className="flex flex-col items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">Everion 🌀</h1>
      </div>
      <MainContent />
    </Dashboard>
  )
}