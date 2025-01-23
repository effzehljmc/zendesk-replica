import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  Ticket,
  Book,
  Settings,
  Users,
  BarChart2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AppSidebar() {
  const location = useLocation();
  const { profile } = useAuth();

  // Check if user is an agent or admin
  const canAccessAnalytics = profile?.roles.some(role => 
    role.name === 'admin' || role.name === 'agent'
  );

  // Check if user is an admin
  const isAdmin = profile?.roles.some(role => role.name === 'admin');

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tickets', href: '/tickets', icon: Ticket },
    { name: 'Knowledge Base', href: '/kb', icon: Book, public: true },
    ...(canAccessAnalytics ? [{ name: 'Analytics', href: '/analytics', icon: BarChart2 }] : []),
    ...(isAdmin ? [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Settings', href: '/admin/settings', icon: Settings }
    ] : [])
  ];

  return (
    <div className="w-64 border-r bg-muted min-h-[calc(100vh-4rem)]">
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