import { BarChart3, Boxes, HelpCircle, LayoutDashboard, LifeBuoy, Settings, Ticket } from 'lucide-react'

const navigation = [
  {
    title: "Support",
    links: [
      {
        title: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
      },
      {
        title: "Tickets",
        icon: Ticket,
        href: "/tickets",
      },
      {
        title: "Knowledge Base",
        icon: HelpCircle,
        href: "/knowledge-base",
      },
    ],
  },
  {
    title: "Insights",
    links: [
      {
        title: "Reports",
        icon: BarChart3,
        href: "/reports",
      },
      {
        title: "Resources",
        icon: Boxes,
        href: "/resources",
      },
    ],
  },
]

export function AppSidebar() {
  return (
    <aside className="w-64 border-r pt-3">
      <div className="px-4">
        <div className="flex items-center gap-2 font-semibold">
          <LifeBuoy className="h-6 w-6" />
          <span>AI-Enhanced Helpdesk</span>
        </div>
      </div>
      <div className="px-2">
        {navigation.map((group) => (
          <div key={group.title} className="py-2">
            <div className="px-2 text-xs font-medium text-muted-foreground">
              {group.title}
            </div>
            <div>
              <nav className="space-y-1">
                {group.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    <link.icon className="h-4 w-4" />
                    {link.title}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        ))}
        <div className="py-2">
          <nav className="space-y-1">
            <a
              href="/settings"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted"
            >
              <Settings className="h-4 w-4" />
              Settings
            </a>
          </nav>
        </div>
      </div>
    </aside>
  )
} 