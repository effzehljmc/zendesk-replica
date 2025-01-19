import { AppSidebar } from './AppSidebar';
import { MainNav } from './MainNav';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <div className="flex">
        <AppSidebar />
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
} 