"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet, ConnectButton } from "@suiet/wallet-kit";

export default function HomePage() {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) {
      router.push("/dashboard");
    }
  }, [connected, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0F] text-white">
      {/* Spiral icon placed above the scripture */}
      <div className="text-6xl mb-4">🌀</div>
      
      <h1 className="mb-8 text-center text-3xl font-bold">
        Connect your wallet to access the dashboard
      </h1>
      
      <ConnectButton>
        Connect wallet
      </ConnectButton>
    </div>
  );
}
