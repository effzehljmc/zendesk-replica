import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MainNav } from './MainNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
} 