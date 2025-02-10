import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Lightbulb, Settings } from "lucide-react"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Lightbulb, label: "Insights", href: "/dashboard/insights" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

const agents = [
  { name: "ElizaOS Core", hint: "Connected" },
  { name: "ElizaOS Analysis", hint: "Prompts set, Sui synced" },
  { name: "ElizaOS Chat", hint: "Chat ready" },
  { name: "7k.agg", hint: "Aggregator active" },
  { name: "EverionTG", hint: "TG active" },
  { name: "EverionX", hint: "Real-time Twitter tracker" },
]

export function LeftSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-secondary p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-foreground">Everion.AI 🌀</h1>
      </div>
      <nav className="mb-8">
        {navItems.map((item) => (
          <Link key={item.label} href={item.href} passHref>
            <Button
              variant="ghost"
              className={`w-full justify-start text-foreground hover:text-primary-foreground ${
                pathname === item.href ? "bg-primary text-primary-foreground" : ""
              }`}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        ))}
      </nav>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Agents</h2>
        {agents.map((agent) => (
          <div key={agent.name} className="relative group mb-2">
            <div className="flex items-center justify-between rounded bg-muted p-2">
              <span className="text-foreground">{agent.name}</span>
              <span className="h-2 w-2 rounded-full bg-green-500" />
            </div>
            {/* Tooltip pop-up */}
            <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md whitespace-nowrap">
                {agent.hint}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
