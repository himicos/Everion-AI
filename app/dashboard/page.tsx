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
      <MainContent />
    </Dashboard>
  )
}

