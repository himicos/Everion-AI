import { useWallet } from "@suiet/wallet-kit";
import { useEffect } from "react";

export default function WalletDebug() {
  const wallet = useWallet();

  useEffect(() => {
    if (wallet.connected) {
      console.log("Wallet is connected ✅");
      console.log("Wallet address:", wallet.account?.address);
    } else {
      console.log("No wallet connected ❌");
    }
  }, [wallet.connected]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">Wallet Debug Info</h2>
      {wallet.connected ? (
        <p className="text-green-500">Connected: {wallet.account?.address}</p>
      ) : (
        <p className="text-red-500">No wallet connected</p>
      )}
    </div>
  );
}
