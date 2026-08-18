import * as React from "react"
import { useLocation, Link, useRoute } from "wouter"
import { useGetMe, useLogout } from "@workspace/api-client-react"
import { 
  LayoutDashboard, 
  Users, 
  Boxes, 
  Activity, 
  LogOut, 
  ShieldCheck,
  Menu,
  UserCircle
} from "lucide-react"
import { Button } from "./ui/button"
import { cn } from "@/lib/utils"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading } = useGetMe()
  const [, setLocation] = useLocation()
  const logout = useLogout()

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading && !me) {
      setLocation("/login")
    }
  }, [me, isLoading, setLocation])

  if (isLoading || !me) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck className="h-12 w-12 animate-pulse text-primary" />
          <div className="font-mono text-sm text-muted-foreground">CONNECTING TO SECURE TERMINAL...</div>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login")
      }
    })
  }

  const NavLinks = () => {
    const links = [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/profile", label: "Mój profil", icon: UserCircle },
      { href: "/users", label: "Users", icon: Users },
      { href: "/apps", label: "Apps", icon: Boxes },
      { href: "/activity", label: "Activity", icon: Activity },
    ]

    return (
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const [isActive] = useRoute(link.href)
          return (
            <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)}>
              <span className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <link.icon className={cn(
                  "flex-shrink-0 -ml-1 mr-3 h-5 w-5",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {link.label}
              </span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r bg-card/50 backdrop-blur-xl">
          <div className="flex h-16 flex-shrink-0 items-center px-6 border-b">
            <ShieldCheck className="h-6 w-6 text-primary mr-3" />
            <span className="font-bold tracking-tight text-lg">AuthHub</span>
          </div>
          
          <div className="flex flex-1 flex-col overflow-y-auto">
            <NavLinks />
          </div>
          
          <div className="flex flex-shrink-0 border-t p-4">
            <div className="flex w-full items-center">
              <div className="flex-shrink-0">
                {me.avatarUrl ? (
                  <img src={me.avatarUrl} alt="" className="inline-block h-9 w-9 rounded-full ring-2 ring-background" />
                ) : (
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                    {me.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate">{me.name}</p>
                <p className="text-xs font-mono text-muted-foreground truncate">{me.role.toUpperCase()}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive shrink-0" title="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="md:hidden flex h-16 items-center justify-between border-b px-4 bg-background">
          <div className="flex items-center">
            <ShieldCheck className="h-6 w-6 text-primary mr-3" />
            <span className="font-bold">AuthHub</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute inset-0 z-40 bg-background/95 backdrop-blur-sm top-16 border-b">
            <NavLinks />
            <div className="p-4 border-t">
              <Button variant="destructive" className="w-full" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </Button>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-muted/20 relative">
          {/* Subtle grid background for the cockpit feel */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
               style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="relative z-10 p-4 md:p-8 w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
