import type React from "react"
import { useRouter } from "next/navigation"
import { useWallet } from "@suiet/wallet-kit"
import { LeftSidebar } from "./left-sidebar"
import { RightSidebar } from "./right-sidebar"
import { Button } from "@/components/ui/button"
import { ChatProvider } from "@/contexts/chat-context"

interface DashboardProps {
  children: React.ReactNode
  hideChat?: boolean
}

export function Dashboard({ children, hideChat = false }: DashboardProps) {
  const { disconnect } = useWallet()
  const router = useRouter()

  const handleDisconnect = async () => {
    await disconnect()
    router.push("/")
  }

  return (
    <ChatProvider>
      <div className="flex h-screen bg-background text-foreground">
        <LeftSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex justify-between items-center p-4">
            <Button
              onClick={handleDisconnect}
              variant="outline"
              className="text-foreground hover:text-primary-foreground"
            >
              Disconnect Wallet
            </Button>
          </header>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
        <RightSidebar hideChat={hideChat} />
      </div>
    </ChatProvider>
  )
}