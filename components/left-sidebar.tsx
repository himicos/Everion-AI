import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, BarChart2, Lightbulb, Settings } from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: BarChart2, label: "Analytics", href: "/dashboard/analytics" },
  { icon: Lightbulb, label: "Insights", href: "/dashboard/insights" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

const aiAgents = [
  { name: "Trading Bot", status: "active" },
  { name: "Risk Analyzer", status: "idle" },
  { name: "Market Predictor", status: "active" },
]

export function LeftSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-secondary p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-foreground">Everion.AI 🌀 </h1>
      </div>
      <nav className="mb-8">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} passHref>
            <Button
              variant="ghost"
              className={`w-full justify-start text-foreground hover:text-primary-foreground ${pathname === item.href ? "bg-primary text-primary-foreground" : ""}`}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">AI Agents</h2>
        {aiAgents.map((agent) => (
          <div key={agent.name} className="mb-2 flex items-center justify-between rounded bg-muted p-2">
            <span className="text-foreground">{agent.name}</span>
            <span className={`h-2 w-2 rounded-full ${agent.status === "active" ? "bg-green-500" : "bg-gray-500"}`} />
          </div>
        ))}
      </div>
    </aside>
  )
}

