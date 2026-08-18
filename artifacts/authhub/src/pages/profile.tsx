import * as React from "react"
import { AppLayout } from "@/components/layout"
import { useGetMe, useGetMeActivity, useListProviders } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProviderIcon } from "@/components/provider-icon"
import { Shield, MapPin, Laptop, Globe, Monitor, Clock, LogIn, UserPlus, Wifi, CheckCircle2, PlusCircle, Lock } from "lucide-react"
import { FaGoogle, FaFacebook, FaGithub, FaDiscord, FaMicrosoft } from "react-icons/fa6"
import { formatDistanceToNow, format, differenceInDays, parseISO, startOfDay } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

// Build last-30-days activity chart data from log entries
function buildActivityChart(logs: Array<{ eventType: string; createdAt: string }>) {
  const counts: Record<string, number> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    counts[format(d, "yyyy-MM-dd")] = 0
  }
  for (const log of logs) {
    const day = format(startOfDay(parseISO(log.createdAt)), "yyyy-MM-dd")
    if (day in counts) counts[day] = (counts[day] ?? 0) + 1
  }
  return Object.entries(counts).map(([date, count]) => ({
    date,
    label: format(parseISO(date), "d MMM"),
    count,
  }))
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn className="h-3.5 w-3.5 text-primary" />,
  register: <UserPlus className="h-3.5 w-3.5 text-emerald-500" />,
}

const PROVIDER_COLORS: Record<string, string> = {
  google: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300",
  facebook: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  github: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300",
  discord: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300",
  microsoft: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300",
}

export default function Profile() {
  const { data: me, isLoading: meLoading } = useGetMe()
  const { data: enabledProviders = [] } = useListProviders()
  const { data: activity = [], isLoading: activityLoading } = useGetMeActivity(
    { limit: 365 },
    { query: { enabled: !!me } }
  )

  if (meLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse max-w-4xl">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-40 bg-muted rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><CardContent className="h-64 pt-6" /></Card>
            <div className="md:col-span-2 space-y-4">
              <Card><CardContent className="h-40 pt-6" /></Card>
              <Card><CardContent className="h-40 pt-6" /></Card>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!me) return null

  const initials = me.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?"

  const memberDays = differenceInDays(new Date(), parseISO(me.createdAt))
  const loginLogs = activity.filter((l) => l.eventType === "login" || l.eventType === "register")
  const totalLogins = loginLogs.length
  const chartData = buildActivityChart(loginLogs)
  const recentLogs = activity.slice(0, 20)

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mój profil</h1>
          <p className="text-muted-foreground font-mono text-xs mt-1">
            TWOJE DANE ZEBRANE PRZEZ AUTHHUB
          </p>
        </div>

        {/* ── Header identity card ── */}
        <Card className="overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20 shrink-0">
                <AvatarImage src={me.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{me.name}</h2>
                  <Badge
                    variant={me.role === "admin" ? "default" : "secondary"}
                    className="font-mono text-xs"
                  >
                    {me.role.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                    {me.status?.toUpperCase() ?? "ACTIVE"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mb-3">{me.email}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    Dołączył(a) {format(parseISO(me.createdAt), "d MMM yyyy")}
                  </span>
                  {me.lastLoginAt && (
                    <span className="flex items-center gap-1">
                      <LogIn className="h-3 w-3" />
                      Ostatnie logowanie{" "}
                      {formatDistanceToNow(parseISO(me.lastLoginAt), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>

              {/* Verification level */}
              <div className="flex flex-col items-center gap-1 px-4 py-3 bg-muted/50 rounded-xl border">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full ${
                        i <= (me.verificationLevel ?? 1) ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">
                  LEVEL {me.verificationLevel ?? 1}/3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile icon={<LogIn className="h-4 w-4 text-primary" />} label="Łączne logowania" value={activityLoading ? "..." : totalLogins.toString()} />
          <StatTile icon={<Clock className="h-4 w-4 text-amber-500" />} label="Dni w systemie" value={memberDays.toString()} />
          <StatTile icon={<Shield className="h-4 w-4 text-emerald-500" />} label="Konta OAuth" value={(me.accounts?.length ?? me.connectedProviders?.length ?? 0).toString()} />
          <StatTile
            icon={<MapPin className="h-4 w-4 text-sky-500" />}
            label="Lokalizacja"
            value={me.geoCity && me.geoCountry ? `${me.geoCity}` : me.geoCountry ?? "—"}
            sub={me.geoCountry}
          />
        </div>

        {/* ── Activity chart ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Aktywność (30 dni)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="h-[160px] bg-muted animate-pulse rounded-lg" />
            ) : (
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(l) => `${l}`}
                      formatter={(v) => [v, "Logowania"]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Provider verification grid ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              Weryfikacja kont
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_PROVIDERS.map((p) => {
                const connected = (me.accounts ?? []).find((a) => a.provider === p.id)
                const enabled = enabledProviders.includes(p.id)
                return (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    connected={connected ? { email: connected.providerEmail ?? undefined, date: connected.createdAt ?? undefined } : undefined}
                    enabled={enabled}
                  />
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Collected data ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                Zebrane dane
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DataRow icon={<MapPin className="h-3.5 w-3.5 text-sky-500" />} label="Kraj" value={me.geoCountry ?? "Nieznany"} />
              <DataRow icon={<MapPin className="h-3.5 w-3.5 text-sky-400" />} label="Miasto" value={me.geoCity ?? "Nieznane"} />
              <DataRow icon={<Wifi className="h-3.5 w-3.5 text-amber-500" />} label="Adres IP" value={me.ipAddress ?? "Nieznany"} mono />
              <DataRow icon={<Monitor className="h-3.5 w-3.5 text-violet-500" />} label="Przeglądarka" value={me.browser ?? "Nieznana"} />
              <DataRow icon={<Laptop className="h-3.5 w-3.5 text-violet-400" />} label="System" value={me.os ?? "Nieznany"} />
              <DataRow icon={<Monitor className="h-3.5 w-3.5 text-muted-foreground" />} label="Urządzenie" value={me.deviceType ?? "desktop"} />
            </CardContent>
          </Card>
        </div>

        {/* ── Recent events ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Historia aktywności
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Brak historii</p>
            ) : (
              <div className="divide-y divide-border/50">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <div className="shrink-0">
                      {EVENT_ICONS[log.eventType ?? ""] ?? <LogIn className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 h-4">
                        {log.eventType}
                      </Badge>
                      {log.provider && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                          <ProviderIcon provider={log.provider} className="h-3 w-3" />
                          {log.provider}
                        </span>
                      )}
                      {(log.geoCity || log.geoCountry) && (
                        <span className="text-xs text-muted-foreground">
                          {[log.geoCity, log.geoCountry].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {log.ipAddress && (
                        <span className="text-xs font-mono text-muted-foreground">{log.ipAddress}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(parseISO(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

function StatTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
        <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function DataRow({ icon, label, value, mono = false }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-muted-foreground shrink-0">
        {icon}
        <span className="text-xs font-mono uppercase">{label}</span>
      </div>
      <p className={`text-sm font-medium text-right truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  )
}

// ─── Provider card ──────────────────────────────────────────────────────────

const ALL_PROVIDERS: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "google",    label: "Google",    icon: <FaGoogle    className="h-5 w-5" />, color: "text-red-500" },
  { id: "facebook",  label: "Facebook",  icon: <FaFacebook  className="h-5 w-5 text-[#1877F2]" />, color: "text-blue-600" },
  { id: "github",    label: "GitHub",    icon: <FaGithub    className="h-5 w-5" />, color: "text-gray-700 dark:text-gray-300" },
  { id: "discord",   label: "Discord",   icon: <FaDiscord   className="h-5 w-5 text-[#5865F2]" />, color: "text-indigo-500" },
  { id: "microsoft", label: "Microsoft", icon: <FaMicrosoft className="h-5 w-5 text-[#00a4ef]" />, color: "text-cyan-500" },
]

function ProviderCard({
  provider,
  connected,
  enabled,
}: {
  provider: (typeof ALL_PROVIDERS)[number]
  connected?: { email?: string; date?: string }
  enabled: boolean
}) {
  if (connected) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className={provider.color}>{provider.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{provider.label}</p>
          {connected.email && (
            <p className="text-[11px] text-muted-foreground truncate">{connected.email}</p>
          )}
        </div>
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-muted px-3 py-3 opacity-50">
        <div className="text-muted-foreground">{provider.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{provider.label}</p>
          <p className="text-[11px] text-muted-foreground">Niezskonfigurowane</p>
        </div>
        <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    )
  }

  return (
    <a href={`/api/auth/${provider.id}/link`} className="block">
      <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer group">
        <div className={provider.color}>{provider.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{provider.label}</p>
          <p className="text-[11px] text-muted-foreground">Kliknij aby połączyć</p>
        </div>
        <PlusCircle className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
    </a>
  )
}
