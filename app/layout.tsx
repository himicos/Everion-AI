import { Inter } from "next/font/google"
import { WalletKitProvider } from "@/components/providers/wallet-provider"
import "@/styles/globals.css"
import type React from "react" // Added import for React

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletKitProvider>{children}</WalletKitProvider>
      </body>
    </html>
  )
}



import './globals.css'