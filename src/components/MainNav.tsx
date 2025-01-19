import { Bell, HelpCircle, Search, User } from 'lucide-react'

export function MainNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <div className="relative flex flex-1 items-center">
          <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search for anything..."
            className="flex h-9 w-full max-w-[500px] rounded-md border border-input bg-muted px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary pl-8"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-muted">
            <HelpCircle className="h-5 w-5" />
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-muted">
            <Bell className="h-5 w-5" />
          </button>
          <div className="relative">
            <button className="inline-flex items-center justify-center rounded-full text-sm font-medium h-9 w-9 hover:bg-muted">
              <User className="h-5 w-5" />
              <span className="sr-only">Toggle user menu</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
} 