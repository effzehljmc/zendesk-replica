import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  Ticket,
  BookOpen,
  Settings,
  Users,
  BarChart
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Tickets', href: '/dashboard/tickets', icon: Ticket },
  { name: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: BookOpen },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart },
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <div className="w-64 border-r bg-muted/10 min-h-[calc(100vh-4rem)]">
      <nav className="space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 