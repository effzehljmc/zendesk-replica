import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Users,
  Settings,
  LayoutDashboard,
  BookOpen,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'Knowledge Base', href: '/admin/knowledge-base', icon: BookOpen },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="flex h-full">
      {/* Admin Sidebar */}
      <div className="w-64 border-r bg-muted/50">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Admin Panel</h2>
          <nav className="space-y-1">
            {adminNavigation.map((item) => {
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
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="container py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
} 