import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MainNav } from './MainNav';

export function Layout() {
  return (
    <div className="min-h-screen">
      <MainNav />
      <div className="flex">
        <AppSidebar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
} 