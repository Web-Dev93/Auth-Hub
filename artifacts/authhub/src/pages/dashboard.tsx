import * as React from "react"
import { AppLayout } from "@/components/layout"
import { useGetStats } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Activity as ActivityIcon, ArrowUpRight, Box, Globe, Monitor } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

const PROVIDER_COLORS: Record<string, string> = {
  google: "#4285F4",
  facebook: "#1877F2",
  github: "#24292e",
  discord: "#5865F2",
  microsoft: "#00a4ef",
}
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats()

  if (isLoading || !stats) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="h-32" /></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card><CardContent className="h-80" /></Card>
            <Card><CardContent className="h-80" /></Card>
          </div>
        </div>
      </AppLayout>
    )
  }

  const averageThisWeek = stats.newUsersThisWeek / 7
  const growth = averageThisWeek > 0 ? ((stats.newUsersToday - averageThisWeek) / averageThisWeek) * 100 : 0

  // Colour provider breakdown with brand colors
  const providerData = stats.providerBreakdown.map((p, i) => ({
    ...p,
    fill: PROVIDER_COLORS[p.provider] ?? CHART_COLORS[i % CHART_COLORS.length],
  }))

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground font-mono text-sm">SYSTEM OVERVIEW & TELEMETRY</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <MetricCard
            title="Active Today"
            value={stats.activeToday.toLocaleString()}
            icon={<ActivityIcon className="h-4 w-4 text-primary" />}
            sub={`${stats.newUsersThisWeek} this week`}
          />
          <MetricCard
            title="New Today"
            value={stats.newUsersToday.toLocaleString()}
            icon={<ArrowUpRight className={`h-4 w-4 ${growth >= 0 ? "text-emerald-500" : "text-destructive"}`} />}
            trend={`${growth > 0 ? "+" : ""}${growth.toFixed(1)}% vs avg`}
            trendUp={growth >= 0}
          />
          <MetricCard
            title="Total Apps"
            value={stats.totalApps.toLocaleString()}
            icon={<Box className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Registrations bar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Rejestracje (14 dni)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.registrationsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => {
                        const d = new Date(val)
                        return `${d.getMonth() + 1}/${d.getDate()}`
                      }}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Provider donut */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Podział wg Providera
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                {providerData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Brak danych
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={providerData}
                        cx="50%"
                        cy="45%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="provider"
                        stroke="none"
                      >
                        {providerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Geographic distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                Top Kraje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.geoBreakdown && stats.geoBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {stats.geoBreakdown.slice(0, 8).map((item, i) => {
                    const max = stats.geoBreakdown[0]?.count ?? 1
                    const pct = Math.round((item.count / max) * 100)
                    return (
                      <div key={item.country ?? i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{item.country ?? "Unknown"}</span>
                          <span className="text-muted-foreground font-mono">{item.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                  Brak danych geograficznych
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device / browser breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Monitor className="h-3.5 w-3.5" />
                Przeglądarki
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.browserBreakdown && stats.browserBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {stats.browserBreakdown.slice(0, 6).map((item, i) => {
                    const max = stats.browserBreakdown[0]?.count ?? 1
                    const pct = Math.round((item.count / max) * 100)
                    return (
                      <div key={item.browser ?? i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium">{item.browser ?? "Unknown"}</span>
                          <span className="text-muted-foreground font-mono">{item.count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                  Brak danych o przeglądarkach
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Most active apps */}
        {stats.appBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Najbardziej Aktywne Aplikacje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.appBreakdown.slice(0, 5).map((app, i) => (
                  <div key={app.appId} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center font-mono text-xs text-primary border border-primary/20">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-medium">{app.appName}</p>
                        <p className="text-xs text-muted-foreground font-mono">ID: {app.appId.substring(0, 8)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono">{app.count.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">users</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}

function MetricCard({
  title, value, icon, sub, trend, trendUp,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  trend?: string
  trendUp?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-mono tracking-tighter">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        {trend && (
          <p className={`text-xs mt-1 ${trendUp ? "text-emerald-500" : "text-destructive"}`}>{trend}</p>
        )}
      </CardContent>
    </Card>
  )
}
