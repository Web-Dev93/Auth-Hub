import * as React from "react"
import { useLocation } from "wouter"
import { useGetMe, useListProviders } from "@workspace/api-client-react"
import { ShieldCheck, AlertCircle, Lock } from "lucide-react"
import { FaGoogle, FaFacebook, FaGithub, FaDiscord, FaMicrosoft } from "react-icons/fa6"

const PROVIDER_CONFIG: Record<string, { label: string; icon: React.ReactNode; href: string; accent: string }> = {
  google: {
    label: "Kontynuuj z Google",
    icon: <FaGoogle className="h-4 w-4" />,
    href: "/api/auth/google",
    accent: "#EA4335",
  },
  facebook: {
    label: "Kontynuuj z Facebook",
    icon: <FaFacebook className="h-4 w-4" />,
    href: "/api/auth/facebook",
    accent: "#1877F2",
  },
  github: {
    label: "Kontynuuj z GitHub",
    icon: <FaGithub className="h-4 w-4" />,
    href: "/api/auth/github",
    accent: "#e6edf3",
  },
  discord: {
    label: "Kontynuuj z Discord",
    icon: <FaDiscord className="h-4 w-4" />,
    href: "/api/auth/discord",
    accent: "#5865F2",
  },
  microsoft: {
    label: "Kontynuuj z Microsoft",
    icon: <FaMicrosoft className="h-4 w-4" />,
    href: "/api/auth/microsoft",
    accent: "#00a4ef",
  },
}

export default function Login() {
  const { data: me, isLoading: meLoading } = useGetMe()
  const { data: providers = [], isLoading: providersLoading } = useListProviders()
  const [, setLocation] = useLocation()

  const error = new URLSearchParams(window.location.search).get("error")

  React.useEffect(() => {
    if (!meLoading && me) setLocation("/")
  }, [me, meLoading, setLocation])

  if (meLoading) return <div className="min-h-screen" style={{ background: "#05101f" }} />

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #05101f 0%, #0a1f3a 50%, #061529 100%)" }}
    >
      {/* Background glow orbs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(30,100,200,0.12) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "10%", right: "15%",
          width: 300, height: 300,
          background: "radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 70%)",
          borderRadius: "50%",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div
            className="h-16 w-16 flex items-center justify-center rounded-2xl relative"
            style={{
              background: "linear-gradient(135deg, rgba(30,100,200,0.3) 0%, rgba(14,165,233,0.15) 100%)",
              border: "1px solid rgba(100,160,255,0.25)",
              boxShadow: "0 0 32px rgba(30,100,200,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <ShieldCheck className="h-8 w-8" style={{ color: "#60a5fa" }} />
          </div>
          <div className="text-center space-y-1">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "#f0f6ff", letterSpacing: "-0.02em" }}
            >
              AuthHub
            </h1>
            <p
              className="text-xs font-mono tracking-widest uppercase"
              style={{ color: "rgba(148,180,220,0.6)" }}
            >
              Secure Identity Platform
            </p>
          </div>
        </div>

        {/* Glass card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(96,165,250,0.5), transparent)" }}
          />

          <div className="p-7 space-y-5">
            {error && (
              <div
                className="flex items-center gap-2 text-sm rounded-lg px-3 py-2.5"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#fca5a5",
                }}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                Uwierzytelnienie nieudane. Spróbuj ponownie.
              </div>
            )}

            <div className="text-center">
              <p className="text-sm" style={{ color: "rgba(148,180,220,0.7)" }}>
                Zaloguj się przez swoje konto
              </p>
            </div>

            <div className="space-y-2.5">
              {providersLoading ? (
                [...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-11 rounded-xl animate-pulse"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  />
                ))
              ) : providers.length === 0 ? (
                <p className="text-center text-sm py-4" style={{ color: "rgba(148,180,220,0.5)" }}>
                  Brak skonfigurowanych providerów.
                </p>
              ) : (
                providers.map((provider) => {
                  const cfg = PROVIDER_CONFIG[provider]
                  if (!cfg) return null
                  return (
                    <a key={provider} href={cfg.href} className="block group">
                      <button
                        className="w-full flex items-center gap-3 h-11 px-4 rounded-xl text-sm font-medium transition-all duration-150"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#e2eaf5",
                          outline: "none",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.09)"
                          e.currentTarget.style.borderColor = `${cfg.accent}40`
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${cfg.accent}20`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
                          e.currentTarget.style.boxShadow = "none"
                        }}
                      >
                        {/* Brand color dot */}
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
                          style={{ background: `${cfg.accent}18`, color: cfg.accent }}
                        >
                          {cfg.icon}
                        </span>
                        <span className="flex-1 text-left">{cfg.label}</span>
                        <span style={{ color: "rgba(148,180,220,0.3)", fontSize: 18 }}>›</span>
                      </button>
                    </a>
                  )
                })
              )}
            </div>

            {/* Security indicators */}
            <div
              className="flex items-center justify-center gap-1.5 pt-1"
              style={{ color: "rgba(148,180,220,0.35)" }}
            >
              <Lock className="h-3 w-3" />
              <span className="text-[10px] font-mono tracking-wider uppercase">
                256-bit encrypted · OAuth 2.0
              </span>
            </div>
          </div>
        </div>

        <p
          className="text-center text-[10px] font-mono tracking-widest uppercase mt-6"
          style={{ color: "rgba(148,180,220,0.25)" }}
        >
          Unauthorized access is prohibited
        </p>
      </div>
    </div>
  )
}
