import { useAccountBalance } from "@suiet/wallet-kit"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

const timeframes = ["1D", "1W", "1M", "3M", "1Y"]

const assets = [
  { name: "Sui", balance: "balance", value: "$15,000", change: "+2.5%" },
  { name: "Ethereum", balance: "5 ETH", value: "$10,000", change: "-1.2%" },
  { name: "Cardano", balance: "1000 ADA", value: "$500", change: "+0.8%" },
]

export function MainContent() {
  const { error, loading, balance } = useAccountBalance()

  const formatBalance = (balance: string) => {
    const balanceNumber = Number(balance) / 1e9 // Convert from MIST to SUI
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "Sui" }).format(balanceNumber)
  }

  const metrics = [
    { label: "Total Balance", value: loading ? <Skeleton className="h-8 w-24" /> : formatBalance(balance) },
    { label: "Active Positions", value: "0" },
    { label: "Performance", value: "0%" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-secondary p-4">
            <h3 className="text-sm text-muted-foreground">{metric.label}</h3>
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
          </Card>
        ))}
      </div>
      <Card className="bg-secondary p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground">Insights stats</h2>
          <div className="space-x-2">
            {timeframes.map((tf) => (
              <Button key={tf} variant="outline" size="sm">
                {tf}
              </Button>
            ))}
          </div>
        </div>
        <div className="h-64 bg-muted">
          <p className="flex h-full items-center justify-center text-muted-foreground">Chart Area</p>
        </div>
      </Card>
      <Card className="bg-secondary p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground">Assets</h2>
          <Link href="/dashboard/insights" passHref>
            <Button variant="outline">View Insights</Button>
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground">Asset Name</TableHead>
              <TableHead className="text-muted-foreground">Balance</TableHead>
              <TableHead className="text-muted-foreground">Value</TableHead>
              <TableHead className="text-muted-foreground">24h Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.name}>
                <TableCell className="text-foreground">{asset.name}</TableCell>
                <TableCell className="text-foreground">{asset.balance}</TableCell>
                <TableCell className="text-foreground">{asset.value}</TableCell>
                <TableCell className="text-foreground">{asset.change}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

