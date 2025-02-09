"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChat } from "@/contexts/chat-context"

interface RightSidebarProps {
  hideChat?: boolean
}

export function RightSidebar({ hideChat = false }: RightSidebarProps) {
  if (hideChat) {
    return null
  }

  const [input, setInput] = useState("")
  const { messages, addMessage } = useChat()

  const handleSendMessage = () => {
    if (!input.trim()) return

    addMessage(input, "user")
    setInput("")

    // Simulate AI response
    setTimeout(() => {
      addMessage("I'm the AI Assistant. I'll help you analyze that.", "ai")
    }, 1000)
  }

  return (
    <aside className="w-80 bg-secondary p-4 flex flex-col h-screen">
      <h2 className="text-xl font-bold mb-4">AI Assistant</h2>
      <ScrollArea className="flex-1 mb-4">
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
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type your message..."
          className="flex-1"
        />
        <Button onClick={handleSendMessage}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  )
}