import * as React from "react"
import { useLocation } from "wouter"
import { useGetMe, useListProviders } from "@workspace/api-client-react"
import { ShieldCheck, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FaGoogle, FaFacebook, FaGithub, FaDiscord, FaMicrosoft } from "react-icons/fa6"

const PROVIDER_CONFIG: Record<string, { label: string; icon: React.ReactNode; href: string; color: string }> = {
  google: {
    label: "Sign in with Google",
    icon: <FaGoogle className="h-4 w-4" />,
    href: "/api/auth/google",
    color: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50",
  },
  facebook: {
    label: "Sign in with Facebook",
    icon: <FaFacebook className="h-4 w-4 text-[#1877F2]" />,
    href: "/api/auth/facebook",
    color: "bg-[#1877F2] text-white hover:bg-[#166FE5]",
  },
  github: {
    label: "Sign in with GitHub",
    icon: <FaGithub className="h-4 w-4" />,
    href: "/api/auth/github",
    color: "bg-[#24292e] text-white hover:bg-[#2f363d]",
  },
  discord: {
    label: "Sign in with Discord",
    icon: <FaDiscord className="h-4 w-4" />,
    href: "/api/auth/discord",
    color: "bg-[#5865F2] text-white hover:bg-[#4752c4]",
  },
  microsoft: {
    label: "Sign in with Microsoft",
    icon: <FaMicrosoft className="h-4 w-4" />,
    href: "/api/auth/microsoft",
    color: "bg-[#00a4ef] text-white hover:bg-[#0090d1]",
  },
}

export default function Login() {
  const { data: me, isLoading: meLoading } = useGetMe()
  const { data: providers = [], isLoading: providersLoading } = useListProviders()
  const [, setLocation] = useLocation()

  const error = new URLSearchParams(window.location.search).get("error")

  React.useEffect(() => {
    if (!meLoading && me) {
      setLocation("/")
    }
  }, [me, meLoading, setLocation])

  if (meLoading) return <div className="min-h-screen bg-background" />

  const isLoading = providersLoading

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="flex flex-col items-center space-y-8">
          {/* Logo + title */}
          <div className="flex flex-col items-center space-y-4">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">AuthHub</h1>
              <p className="text-muted-foreground font-mono text-sm">SECURE TERMINAL ACCESS</p>
            </div>
          </div>

          {/* Auth card */}
          <div className="w-full bg-card border border-border p-6 rounded-xl shadow-lg relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent rounded-t-xl" />

            <div className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Authentication failed. Please try again.
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Zaloguj się przez swoje konto
                </p>
              </div>

              <div className="space-y-2.5">
                {isLoading ? (
                  <div className="space-y-2.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-11 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : providers.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Brak skonfigurowanych providerów OAuth.
                  </p>
                ) : (
                  providers.map((provider) => {
                    const cfg = PROVIDER_CONFIG[provider]
                    if (!cfg) return null
                    return (
                      <a key={provider} href={cfg.href} className="block">
                        <Button
                          variant="outline"
                          className={`w-full h-11 text-sm font-medium gap-2.5 transition-all hover:scale-[1.01] ${cfg.color}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </Button>
                      </a>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            UNAUTHORIZED ACCESS IS PROHIBITED
          </p>
        </div>
      </div>
    </div>
  )
}
