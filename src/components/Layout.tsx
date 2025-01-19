import { ThemeProvider } from "./ThemeProvider"
import { MainNav } from "./MainNav"
import { AppSidebar } from "./AppSidebar"

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <div className="relative flex min-h-screen">
        <AppSidebar />
        <div className="flex w-full flex-1 flex-col">
          <MainNav />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  )
} 