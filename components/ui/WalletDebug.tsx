import { useWallet } from "@suiet/wallet-kit";

export default function WalletDebug() {
  const wallet = useWallet();

  if (!wallet.connected) {
    return null;
  }

  return (
    <div className="p-4">
      <p className="text-green-500">Connected: {wallet.account?.address}</p>
    </div>
  );
}
